import { createHash } from 'node:crypto';

export interface HashableEvent {
  orderId: string;
  sequence: number;
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string;
  occurredAt: Date;
  previousHash: string | null;
}

/**
 * Per-order SHA-256 hash chain (charter immutability layer 3). Each event's
 * hash folds in the previous event's hash, so altering any historical row
 * invalidates every subsequent link — detectable by GET /tracking/verify.
 * The field order here is the contract; never reorder it.
 */
export function computeEventHash(e: HashableEvent): string {
  const payload = [
    e.orderId,
    String(e.sequence),
    e.fromStatus ?? '',
    e.toStatus,
    e.actorUserId,
    e.occurredAt.toISOString(),
    e.previousHash ?? '',
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}
