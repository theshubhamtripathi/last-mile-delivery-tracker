import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type NotificationTemplateKey =
  | 'ORDER_CONFIRMED'
  | 'AGENT_ASSIGNED'
  | 'STATUS_PICKED_UP'
  | 'STATUS_IN_TRANSIT'
  | 'STATUS_OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RESCHEDULED';

export interface EnqueueParams {
  orderId: string;
  templateKey: NotificationTemplateKey;
  /** The order row (already loaded in the caller's transaction). */
  order: { orderNumber: string; customerId: string; totalPaise: number };
  extra?: Record<string, unknown>;
}

/**
 * Transactional outbox. The status/order write and the outbox row commit in the
 * SAME transaction, so a rolled-back change never sends a phantom message and a
 * committed one is guaranteed to be picked up by the worker. Sending itself is
 * out of band (see NotificationWorker), keeping the request fast.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueWithinTx(
    tx: Prisma.TransactionClient,
    params: EnqueueParams,
  ): Promise<void> {
    const customer = await tx.user.findUnique({
      where: { id: params.order.customerId },
      select: { email: true, phone: true, fullName: true },
    });
    if (!customer) return;

    const payload = {
      templateKey: params.templateKey,
      orderNumber: params.order.orderNumber,
      customerName: customer.fullName,
      totalPaise: params.order.totalPaise,
      ...params.extra,
    } as Prisma.InputJsonValue;

    await tx.notificationOutbox.createMany({
      data: [
        {
          orderId: params.orderId,
          channel: 'EMAIL',
          templateKey: params.templateKey,
          recipient: customer.email,
          payload,
          status: 'QUEUED',
        },
        {
          orderId: params.orderId,
          channel: 'SMS',
          templateKey: params.templateKey,
          recipient: customer.phone,
          payload,
          status: 'QUEUED',
        },
      ],
    });
  }

  list(params: { status?: string; take?: number }) {
    return this.prisma.notificationOutbox.findMany({
      where: params.status ? { status: params.status as Prisma.NotificationOutboxWhereInput['status'] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      include: { order: { select: { orderNumber: true } } },
    });
  }
}
