import { HttpStatus, Injectable } from '@nestjs/common';
import { checkTransition } from '@lmd/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import type { AuthUser } from '../../common/types';
import { TrackingService } from '../tracking/tracking.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AssignmentService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tracking: TrackingService,
    protected readonly notifications: NotificationsService,
  ) {}

  /** Admin manually assigns a specific agent. */
  async assignManual(orderId: string, agentId: string, actor: AuthUser) {
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new AppException('AGENT_NOT_FOUND', 'Agent not found', HttpStatus.NOT_FOUND);
    if (agent.availability === 'OFFLINE') {
      throw new AppException('AGENT_OFFLINE', 'Agent is offline', HttpStatus.CONFLICT);
    }
    if (agent.activeOrderCount >= agent.maxConcurrentOrders) {
      throw new AppException('AGENT_AT_CAPACITY', 'Agent is at capacity', HttpStatus.CONFLICT);
    }
    return this.commitAssignment(orderId, agentId, actor, 'MANUAL', 'Manually assigned by admin', {
      chosen: { agentId, agentCode: agent.agentCode },
    });
  }

  /**
   * Shared commit path for manual and auto assignment. Runs in one transaction:
   * verifies the order is assignable via the state machine, moves it to
   * ASSIGNED, bumps the agent's load and optimistic-lock version, appends the
   * history event, records the AssignmentLog, and enqueues the notification.
   */
  protected async commitAssignment(
    orderId: string,
    agentId: string,
    actor: AuthUser,
    strategy: 'MANUAL' | 'AUTO' | 'REASSIGN_AFTER_FAILURE',
    selectionReason: string,
    candidateSnapshot: Prisma.InputJsonValue,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { assignedAgent: true },
      });
      if (!order) throw new AppException('ORDER_NOT_FOUND', 'Order not found', HttpStatus.NOT_FOUND);

      const check = checkTransition(order.currentStatus, 'ASSIGNED', 'ADMIN');
      if (!check.allowed) {
        throw new AppException(
          'INVALID_TRANSITION',
          `Order in ${order.currentStatus} cannot be assigned. Allowed next: ${check.allowedNext.join(', ') || 'none'}`,
          HttpStatus.CONFLICT,
        );
      }

      // Optimistic lock: fail if the agent row changed under us (double-book guard).
      const agentRow = await tx.agent.findUnique({ where: { id: agentId } });
      if (!agentRow) throw new AppException('AGENT_NOT_FOUND', 'Agent not found', HttpStatus.NOT_FOUND);
      if (agentRow.activeOrderCount >= agentRow.maxConcurrentOrders) {
        throw new AppException('AGENT_AT_CAPACITY', 'Agent is at capacity', HttpStatus.CONFLICT);
      }
      // Capacity is gated by activeOrderCount < maxConcurrentOrders, so an
      // assigned agent stays AVAILABLE for further orders until they hit
      // capacity or manually go ON_DUTY/OFFLINE. (Previously this flipped them to
      // ON_DUTY, which wrongly made them ineligible for a second concurrent order.)
      const updated = await tx.agent.updateMany({
        where: { id: agentId, version: agentRow.version },
        data: { activeOrderCount: { increment: 1 }, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new AppException('ASSIGNMENT_CONFLICT', 'Agent was modified concurrently; retry', HttpStatus.CONFLICT);
      }

      // If reassigning, release the previously assigned agent's capacity.
      if (order.assignedAgentId && order.assignedAgentId !== agentId) {
        await tx.agent.update({
          where: { id: order.assignedAgentId },
          data: { activeOrderCount: { decrement: 1 } },
        });
      }

      await tx.order.update({ where: { id: orderId }, data: { assignedAgentId: agentId } });

      await this.tracking.appendWithinTx(tx, {
        orderId,
        fromStatus: order.currentStatus,
        toStatus: 'ASSIGNED',
        actorUserId: actor.userId,
        actorRole: actor.role,
        metadata: { strategy, agentId },
      });

      await tx.assignmentLog.create({
        data: {
          orderId,
          agentId,
          strategy,
          candidateSnapshot,
          selectionReason,
          assignedByUserId: actor.userId,
        },
      });

      await this.notifications.enqueueWithinTx(tx, {
        orderId,
        templateKey: 'AGENT_ASSIGNED',
        order,
        extra: { agentId, strategy },
      });

      return { orderId, agentId, strategy, status: 'ASSIGNED' as const };
    });
  }
}
