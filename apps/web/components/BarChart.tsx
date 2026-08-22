/**
 * Hand-rolled horizontal SVG/CSS bars — a charting library is ~500 KB for a
 * handful of bars (charter §3). On-palette, accessible labels.
 */
export function BarChart({
  data,
  color = 'var(--bar, #1B4DE4)',
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2" style={{ ['--bar' as string]: color }}>
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate font-mono text-xs text-ink/70">{d.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-sm bg-paper">
            <div
              className="h-full rounded-sm"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color, minWidth: d.value > 0 ? 4 : 0 }}
              role="img"
              aria-label={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="w-10 text-right font-mono text-xs tabular-nums text-ink">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
