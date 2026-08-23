import type { OrderStatus } from '@/lib/api';

const STYLES: Record<OrderStatus, { pill: string; dot: string }> = {
  CREATED: { pill: 'border-line text-muted bg-overlay/50', dot: 'bg-muted' },
  ASSIGNED: { pill: 'border-stamp/40 text-stamp bg-stamp/10', dot: 'bg-stamp shadow-[0_0_8px] shadow-stamp' },
  PICKED_UP: { pill: 'border-sky/40 text-sky bg-sky/10', dot: 'bg-sky shadow-[0_0_8px] shadow-sky' },
  IN_TRANSIT: { pill: 'border-sky/40 text-sky bg-sky/10', dot: 'bg-sky shadow-[0_0_8px] shadow-sky' },
  OUT_FOR_DELIVERY: { pill: 'border-hold/40 text-hold bg-hold/10', dot: 'bg-hold shadow-[0_0_8px] shadow-hold' },
  DELIVERED: { pill: 'border-cleared/40 text-cleared bg-cleared/10', dot: 'bg-cleared shadow-[0_0_8px] shadow-cleared' },
  FAILED: { pill: 'border-consign/40 text-consign bg-consign/10', dot: 'bg-consign shadow-[0_0_8px] shadow-consign' },
  RESCHEDULED: { pill: 'border-hold/40 text-hold bg-hold/10', dot: 'bg-hold shadow-[0_0_8px] shadow-hold' },
  CANCELLED: { pill: 'border-line text-faint bg-overlay/40 line-through', dot: 'bg-faint' },
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide ${s.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
