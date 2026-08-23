'use client';

import { useEffect, useState } from 'react';

/**
 * Hand-rolled animated bars — a charting library is ~500 KB for a handful of
 * bars (charter §3). Bars grow on mount for a bit of life.
 */
export function BarChart({
  data,
  tone = 'brand',
}: {
  data: { label: string; value: number }[];
  tone?: 'brand' | 'cleared' | 'hold';
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const max = Math.max(1, ...data.map((d) => d.value));
  const fill = {
    brand: 'bg-grad-brand',
    cleared: 'bg-gradient-to-r from-cleared/80 to-cleared',
    hold: 'bg-gradient-to-r from-hold/80 to-hold',
  }[tone];

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate font-mono text-xs text-muted">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-overlay/70">
            <div
              className={`h-full rounded-full ${fill} transition-[width] duration-700 ease-out`}
              style={{
                width: mounted ? `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` : '0%',
                transitionDelay: `${i * 60}ms`,
              }}
              role="img"
              aria-label={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="w-8 text-right font-mono text-xs tabular-nums text-ink">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
