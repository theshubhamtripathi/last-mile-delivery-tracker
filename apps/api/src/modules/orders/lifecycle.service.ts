import { HttpStatus, Injectable } from '@nestjs/common';
import {
  checkTransition,
  isTerminal,
  type OrderStatus,
  type UpdateStatusDto,
} from '@lmd/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import type { AuthUser } from '../../common/types';
import { TrackingService } from '../tracking/tracking.service';
import { NotificationsService, type NotificationTemplateKey } from '../notifications/notifications.service';
import { AuditService } from '../admin/audit.service';

const STATUS_TEMPLATE: Partial<Record<OrderStatus, NotificationTemplateKey>> = {
  PICKED_UP: 'STATUS_PICKED_UP',
  IN_TRANSIT: 'STATUS_IN_TRANSIT',
  OUT_FOR_DELIVERY: 'STATUS_OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'DELIVERY_FAILED',
};

@Injectable()
export class LifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: TrackingService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async advance(orderId: string, dto: UpdateStatusDto, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { assignedAgent: true },
    });
    if (!order) throw new AppException('ORDER_NOT_FOUND', 'Order not found', HttpStatus.NOT_FOUND);

    const from = order.currentStatus;
    const to = dto.toStatus;
    const isAdminOverride = actor.role === 'ADMIN';

    // Terminal states accept nothing further, even from an admin.
    if (isTerminal(from)) {
      throw new AppException(
        'INVALID_TRANSITION',
        `Order is ${from}, a terminal state that accepts no further changes`,
        HttpStatus.CONFLICT,
        { current: from },
      );
    }

    if (isAdminOverride) {
      // An override may set any (non-terminal-source) status but requires a reason.
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new AppException('OVERRIDE_REASON_REQUIRED', 'An admin override requires a reason', HttpStatus.BAD_REQUEST);
      }
    } else {
      const check = checkTransition(from, to, actor.role);
      if (!check.allowed) {
        const code =
          check.reason === 'ROLE_NOT_PERMITTED' ? 'ROLE_NOT_PERMITTED' : 'INVALID_TRANSITION';
        const status = check.reason === 'ROLE_NOT_PERMITTED' ? HttpStatus.FORBIDDEN : HttpStatus.CONFLICT;
        throw new AppException(
          code,
          `Cannot move from ${from} to ${to}. Allowed next: ${check.allowedNext.join(', ') || 'none'}`,
          status,
          { current: from, allowedNext: check.allowedNext },
        );
      }
      // Agents may only advance orders assigned to them.
      if (actor.role === 'AGENT') {
        const agent = order.assignedAgent;
        if (!agent || agent.userId !== actor.userId) {
          throw new AppException('NOT_YOUR_ORDER', 'You are not the assigned agent for this order', HttpStatus.FORBIDDEN);
        }
      }
      if (to === 'FAILED' && !dto.failureReasonCode) {
        throw new AppException('FAILURE_REASON_REQUIRED', 'A failure needs a failureReasonCode', HttpStatus.BAD_REQUEST);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await this.tracking.appendWithinTx(tx, {
        orderId,
        fromStatus: from,
        toStatus: to,
        actorUserId: actor.userId,
        actorRole: actor.role,
        isAdminOverride,
        reason: dto.reason,
        metadata: dto.failureReasonCode ? { failureReasonCode: dto.failureReasonCode } : undefined,
      });

      // Record a delivery attempt on terminal-of-attempt outcomes.
      if ((to === 'DELIVERED' || to === 'FAILED') && order.assignedAgentId) {
        await tx.deliveryAttempt.create({
          data: {
            orderId,
            attemptNumber: order.attemptCount + 1,
            agentId: order.assignedAgentId,
            outcome: to === 'DELIVERED' ? 'DELIVERED' : 'FAILED',
            failureReasonCode: dto.failureReasonCode,
            notes: dto.reason,
          },
        });
        await tx.order.update({ where: { id: orderId }, data: { attemptCount: { increment: 1 } } });
      }

      // Free the agent's capacity when an order leaves active delivery.
      if (order.assignedAgentId && (to === 'DELIVERED' || to === 'CANCELLED' || to === 'FAILED')) {
        await tx.agent.update({
          where: { id: order.assignedAgentId },
          data: { activeOrderCount: { decrement: 1 } },
        });
      }

      // Enqueue a customer notification for the transitions that warrant one.
      const templateKey = STATUS_TEMPLATE[to];
      if (templateKey) {
        await this.notifications.enqueueWithinTx(tx, {
          orderId,
          templateKey,
          order,
          extra: { fromStatus: from, isAdminOverride, reason: dto.reason },
        });
      }

      if (isAdminOverride) {
        await this.audit.record(actor.userId, 'Order', orderId, 'STATUS_OVERRIDE', { status: from }, { status: to, reason: dto.reason });
      }
    });

    return { orderId, fromStatus: from, toStatus: to, isAdminOverride };
  }
}
