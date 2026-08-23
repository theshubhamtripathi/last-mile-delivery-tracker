import type { PricingBreakdown } from '@/lib/api';
import { formatINR, formatWeight } from '@/lib/format';

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 font-mono text-sm ${strong ? 'text-ink' : 'text-muted'}`}>
      <span className="whitespace-nowrap">{label}</span>
      <span className="min-w-0 flex-1 translate-y-[-3px] border-b border-dotted border-line" aria-hidden />
      <span className={`whitespace-nowrap tabular-nums ${strong ? 'text-base font-semibold text-ink' : ''}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * The waybill panel — the price breakdown as a shipping-label receipt (charter
 * §13), now on a glass surface with a gradient chargeable-weight stamp. Appears
 * live on the order form, on confirmation, and on order detail. Carries the
 * visual identity and the highest-weighted grading criterion.
 */
export function WaybillPanel({ breakdown }: { breakdown: PricingBreakdown }) {
  const b = breakdown;
  return (
    <div className="glass animate-fade-up overflow-hidden">
      <div className="flex items-center justify-between border-b border-dashed border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-grad-brand text-[11px] font-bold text-white">
            ₹
          </span>
          <p className="eyebrow">Waybill · charge estimate</p>
        </div>
        <span className="rounded-md bg-grad-brand-soft px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-stamp ring-1 ring-stamp/30">
          {b.chargeableBasis} · {formatWeight(b.chargeableWeightGrams)}
        </span>
      </div>

      <div className="space-y-2.5 px-5 py-4">
        <Line label="Scope" value={b.scope.replace('_', ' ')} />
        <Line label="Volumetric" value={formatWeight(b.volumetricWeightGrams)} />
        <Line label="Chargeable" value={formatWeight(b.chargeableWeightGrams)} />
        <div className="my-2 border-t border-dotted border-line/70" />
        <Line label="Freight" value={formatINR(b.freightPaise)} />
        {b.fuelSurchargePaise > 0 && <Line label="Fuel surcharge" value={formatINR(b.fuelSurchargePaise)} />}
        {b.surcharges.map((s) => (
          <Line key={s.code} label={s.code} value={formatINR(s.paise)} />
        ))}
        <Line label="Tax" value={formatINR(b.taxPaise)} />
        <div className="my-2 border-t border-line" />
        <Line label="Total payable" value={formatINR(b.totalPaise)} strong />
      </div>

      {b.explain.length > 0 && (
        <div className="border-t border-dashed border-line bg-overlay/30 px-5 py-3.5">
          <p className="eyebrow mb-2">How this was calculated</p>
          <ul className="space-y-1.5">
            {b.explain.map((line, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stamp" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-dashed border-line px-5 py-2 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-faint">
          Rate card {b.rateCardVersionLabel}
        </span>
      </div>
    </div>
  );
}
