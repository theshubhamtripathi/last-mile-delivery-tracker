import { HttpStatus, Injectable } from '@nestjs/common';
import type { RescheduleDto } from '@lmd/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import type { AuthUser } from '../../common/types';
import { TrackingService } from '../tracking/tracking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutoAssignmentService } from '../assignment/auto-assignment.service';

@Injectable()
export class RescheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: TrackingService,
    private readonly notifications: NotificationsService,
    private readonly autoAssignment: AutoAssignmentService,
  ) {}

  /**
   * The failed-delivery loop (charter §10): capture the new date, move
   * FAILED → RESCHEDULED, then auto-reassign excluding the agent who failed the
   * attempt, landing back at ASSIGNED. Every attempt stays on the timeline.
   */
  async reschedule(orderId: string, dto: RescheduleDto, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppException('ORDER_NOT_FOUND', 'Order not found', HttpStatus.NOT_FOUND);
    if (actor.role === 'CUSTOMER' && order.customerId !== actor.userId) {
      throw new AppException('FORBIDDEN', 'Not your order', HttpStatus.FORBIDDEN);
    }
    if (order.currentStatus !== 'FAILED') {
      throw new AppException(
        'NOT_RESCHEDULABLE',
        `Only a FAILED order can be rescheduled; this order is ${order.currentStatus}`,
        HttpStatus.CONFLICT,
      );
    }

    const requestedDate = new Date(dto.requestedDate);
    if (requestedDate.getTime() < Date.now()) {
      throw new AppException('DATE_IN_PAST', 'Requested date must be in the future', HttpStatus.BAD_REQUEST);
    }

    const lastFailed = await this.prisma.deliveryAttempt.findFirst({
      where: { orderId, outcome: 'FAILED' },
      orderBy: { attemptedAt: 'desc' },
    });

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rescheduleRequest.create({
        data: {
          orderId,
          failedAttemptId: lastFailed?.id ?? '',
          requestedDate,
          requestedByUserId: actor.userId,
          status: 'PENDING',
        },
      });
      await this.tracking.appendWithinTx(tx, {
        orderId,
        fromStatus: 'FAILED',
        toStatus: 'RESCHEDULED',
        actorUserId: actor.userId,
        actorRole: actor.role,
        reason: 'Customer requested reschedule',
        metadata: { requestedDate: requestedDate.toISOString() },
      });
      await tx.order.update({ where: { id: orderId }, data: { promisedDate: requestedDate } });
      await this.notifications.enqueueWithinTx(tx, {
        orderId,
        templateKey: 'RESCHEDULED',
        order,
        extra: { requestedDate: requestedDate.toISOString() },
      });
      return created;
    });

    // Reassign to a different agent (the failed one is excluded).
    let reassignment: unknown = null;
    try {
      reassignment = await this.autoAssignment.reassignAfterFailure(orderId, actor);
      await this.prisma.rescheduleRequest.update({ where: { id: request.id }, data: { status: 'FULFILLED' } });
    } catch (err) {
      // Leave the order in RESCHEDULED for an admin to assign manually; surface why.
      if (err instanceof AppException) {
        return { rescheduleId: request.id, status: 'RESCHEDULED', reassignment: null, reassignmentError: err.code };
      }
      throw err;
    }

    return { rescheduleId: request.id, status: 'ASSIGNED', reassignment };
  }
}
