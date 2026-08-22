import type { Prisma } from '@prisma/client';

/**
 * Human-readable order numbers like LMD-2608-000142: LMD, YYMM, then a
 * zero-padded per-month sequence. Computed inside the order transaction from
 * the count of that month's orders; the unique constraint on orderNumber is the
 * final guard against a race.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  now: Date,
): Promise<string> {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const count = await tx.order.count({
    where: { createdAt: { gte: monthStart, lt: nextMonth } },
  });
  const seq = String(count + 1).padStart(6, '0');
  return `LMD-${yy}${mm}-${seq}`;
}
