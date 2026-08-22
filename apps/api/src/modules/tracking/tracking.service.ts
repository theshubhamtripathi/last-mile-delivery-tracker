import { Injectable } from '@nestjs/common';
import { Prisma, type OrderStatus, type Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeEventHash } from './hash-chain';

export interface AppendEventParams {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorUserId: string;
  actorRole: Role;
  isAdminOverride?: boolean;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * The only writer of order history. It exposes append() and read methods and
 * NO update or delete path (immutability layer 1). Every append also writes the
 * hash chain (layer 3) and projects Order.currentStatus in the same
 * transaction, so the denormalised status can never drift from the log.
 */
@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Append within an existing transaction — used by order/lifecycle writes. */
  async appendWithinTx(
    tx: Prisma.TransactionClient,
    params: AppendEventParams,
  ) {
    const last = await tx.orderStatusEvent.findFirst({
      where: { orderId: params.orderId },
      orderBy: { sequence: 'desc' },
    });
    const sequence = (last?.sequence ?? 0) + 1;
    const previousHash = last?.hash ?? null;
    const occurredAt = new Date();
    const hash = computeEventHash({
      orderId: params.orderId,
      sequence,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      actorUserId: params.actorUserId,
      occurredAt,
      previousHash,
    });

    const event = await tx.orderStatusEvent.create({
      data: {
        orderId: params.orderId,
        sequence,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        isAdminOverride: params.isAdminOverride ?? false,
        reason: params.reason,
        metadata: params.metadata,
        occurredAt,
        previousHash,
        hash,
      },
    });

    // Denormalised projection of the latest event; the log stays the truth.
    await tx.order.update({
      where: { id: params.orderId },
      data: { currentStatus: params.toStatus },
    });

    return event;
  }

  list(orderId: string) {
    return this.prisma.orderStatusEvent.findMany({
      where: { orderId },
      orderBy: { sequence: 'asc' },
      include: { actor: { select: { fullName: true, role: true } } },
    });
  }

  /** Recompute the chain and report whether it is intact. */
  async verify(orderId: string): Promise<{
    valid: boolean;
    eventsVerified: number;
    brokenAtSequence?: number;
  }> {
    const events = await this.prisma.orderStatusEvent.findMany({
      where: { orderId },
      orderBy: { sequence: 'asc' },
    });

    let previousHash: string | null = null;
    for (const e of events) {
      const expected = computeEventHash({
        orderId: e.orderId,
        sequence: e.sequence,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actorUserId: e.actorUserId,
        occurredAt: e.occurredAt,
        previousHash,
      });
      if (expected !== e.hash || e.previousHash !== previousHash) {
        return { valid: false, eventsVerified: events.length, brokenAtSequence: e.sequence };
      }
      previousHash = e.hash;
    }
    return { valid: true, eventsVerified: events.length };
  }
}
