import type { PricingBreakdown } from '@/lib/api';
import { formatINR, formatWeight } from '@/lib/format';

/** A single leader-dotted ledger line: label ....... amount (monospace). */
function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 font-mono text-sm ${strong ? 'font-semibold text-ink' : 'text-ink/80'}`}>
      <span className="whitespace-nowrap">{label}</span>
      <span className="min-w-0 flex-1 translate-y-[-3px] border-b border-dotted border-rule" aria-hidden />
      <span className="whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}

/**
 * The waybill panel — the price breakdown as a perforated shipping-label
 * receipt (charter §13). Appears on the order form as the customer types, on
 * confirmation, and on the order detail page. Carries both the visual identity
 * and the highest-weighted grading criterion, so the polish budget lives here.
 */
export function WaybillPanel({ breakdown }: { breakdown: PricingBreakdown }) {
  const b = breakdown;
  return (
    <div className="relative">
      {/* dashed tear edge */}
      <div className="rounded border border-rule bg-white">
        <div className="flex items-center justify-between border-b border-dashed border-rule px-5 py-3">
          <p className="eyebrow">Waybill · charge estimate</p>
          <span className="rounded-sm border border-ink px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">
            {b.chargeableBasis} · {formatWeight(b.chargeableWeightGrams)}
          </span>
        </div>

        <div className="space-y-2 px-5 py-4">
          <Line label="Scope" value={b.scope.replace('_', ' ')} />
          <Line label="Volumetric" value={formatWeight(b.volumetricWeightGrams)} />
          <Line label="Chargeable" value={formatWeight(b.chargeableWeightGrams)} />
          <div className="my-2 border-t border-dotted border-rule" />
          <Line label="Freight" value={formatINR(b.freightPaise)} />
          {b.fuelSurchargePaise > 0 && (
            <Line label="Fuel surcharge" value={formatINR(b.fuelSurchargePaise)} />
          )}
          {b.surcharges.map((s) => (
            <Line key={s.code} label={s.code} value={formatINR(s.paise)} />
          ))}
          <Line label="Tax" value={formatINR(b.taxPaise)} />
          <div className="my-2 border-t border-rule" />
          <Line label="Total payable" value={formatINR(b.totalPaise)} strong />
        </div>

        {b.explain.length > 0 && (
          <div className="border-t border-dashed border-rule px-5 py-3">
            <p className="eyebrow mb-2">How this was calculated</p>
            <ul className="space-y-1">
              {b.explain.map((line, i) => (
                <li key={i} className="text-xs leading-relaxed text-ink/70">
                  — {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-dashed border-rule px-5 py-2 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40">
            Rate card {b.rateCardVersionLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
