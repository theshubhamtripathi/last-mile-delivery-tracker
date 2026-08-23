import type { TimelineEvent } from '@/lib/api';
import { StatusPill } from './StatusPill';
import { formatDateTime } from '@/lib/format';

/**
 * The waybill timeline: every status change with who did it and when, override
 * flags surfaced (never hidden), on an animated gradient rail with glowing
 * nodes.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <li key={e.sequence} className="relative flex gap-4 pb-6 last:pb-0 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-3.5 w-3.5 rounded-full border-2 ${
                  last ? 'border-stamp bg-stamp shadow-[0_0_10px] shadow-stamp/60' : 'border-stamp/60 bg-surface'
                }`}
              />
              {!last && <span className="w-px flex-1 bg-gradient-to-b from-stamp/40 to-line" />}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={e.toStatus} />
                {e.isAdminOverride && (
                  <span className="rounded-full border border-consign/40 bg-consign/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-consign">
                    override
                  </span>
                )}
                <span className="font-mono text-xs text-faint">{formatDateTime(e.occurredAt)}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                by <span className="font-medium text-ink">{e.actorName}</span>{' '}
                <span className="font-mono uppercase text-faint">({e.actorRole})</span>
                {e.fromStatus && (
                  <>
                    {' · '}
                    <span className="font-mono">
                      {e.fromStatus.replace(/_/g, ' ')} → {e.toStatus.replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </p>
              {e.reason && <p className="mt-1 text-xs italic text-muted">“{e.reason}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
