import type { OrderStatus } from '@/lib/api';

const STYLES: Record<OrderStatus, string> = {
  CREATED: 'border-rule text-ink/70 bg-paper',
  ASSIGNED: 'border-stamp/40 text-stamp bg-stamp/5',
  PICKED_UP: 'border-ink/30 text-ink bg-white',
  IN_TRANSIT: 'border-ink/30 text-ink bg-white',
  OUT_FOR_DELIVERY: 'border-hold/40 text-hold bg-hold/5',
  DELIVERED: 'border-cleared/40 text-cleared bg-cleared/5',
  FAILED: 'border-consign/40 text-consign bg-consign/5',
  RESCHEDULED: 'border-hold/40 text-hold bg-hold/5',
  CANCELLED: 'border-rule text-ink/40 bg-paper line-through',
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-xs uppercase tracking-wide ${STYLES[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
