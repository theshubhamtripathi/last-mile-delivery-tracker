import type { TimelineEvent } from '@/lib/api';
import { StatusPill } from './StatusPill';
import { formatDateTime } from '@/lib/format';

/**
 * The waybill timeline: every status change with who did it and when, override
 * flags surfaced (never hidden — that would defeat the audit trail), rendered
 * as a vertical rail of stamped entries.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => (
        <li key={e.sequence} className="relative flex gap-4 pb-6 last:pb-0">
          {/* rail */}
          <div className="flex flex-col items-center">
            <span className="mt-1 h-3 w-3 rounded-full border-2 border-stamp bg-white" />
            {i < events.length - 1 && <span className="w-px flex-1 bg-rule" />}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={e.toStatus} />
              {e.isAdminOverride && (
                <span className="rounded border border-consign/40 bg-consign/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-consign">
                  override
                </span>
              )}
              <span className="font-mono text-xs text-ink/50">
                {formatDateTime(e.occurredAt)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              by <span className="font-medium text-ink/80">{e.actorName}</span>{' '}
              <span className="font-mono uppercase">({e.actorRole})</span>
              {e.fromStatus && (
                <>
                  {' · '}
                  <span className="font-mono">{e.fromStatus.replace(/_/g, ' ')} → {e.toStatus.replace(/_/g, ' ')}</span>
                </>
              )}
            </p>
            {e.reason && <p className="mt-1 text-xs italic text-ink/60">“{e.reason}”</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
