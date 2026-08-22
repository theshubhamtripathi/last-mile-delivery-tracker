import { clampPaise, formatINR, percentOf, sumPaise, type Paise } from '../money';
import { PricingError } from './errors';
import type {
  ChargeableBasisValue,
  PricingConfigBundle,
  PricingInput,
  PricingResult,
  RateCardData,
  RateSlabData,
  RateScopeValue,
  SurchargeLine,
  SurchargeRuleData,
} from './types';

// Guard rails for "absurd dimensions/weight rejected" (charter §6 tests).
const MAX_DIMENSION_CM = 1000; // a 10 m edge is not a parcel
const MAX_WEIGHT_GRAMS = 10_000_000; // 10 tonnes

/**
 * The pure rate calculator. No I/O, no framework, no clock — the caller passes
 * `asOf` and the loaded configuration, which is what makes the result provable
 * and lets the browser run the identical function for a live preview while the
 * API stays authoritative. Every branch is covered by the table tests.
 */
export function computeCharge(
  input: PricingInput,
  config: PricingConfigBundle,
): PricingResult {
  const explain: string[] = [];
  validateInput(input);

  const { pricingConfig } = config;
  if (pricingConfig.volumetricDivisor <= 0) {
    throw new PricingError('CONFIG_INVALID', 'volumetricDivisor must be positive');
  }

  // 1. Scope
  const scope: RateScopeValue =
    input.pickupZoneId === input.dropZoneId ? 'INTRA_ZONE' : 'INTER_ZONE';
  explain.push(
    scope === 'INTRA_ZONE'
      ? 'Pickup and drop are in the same zone — intra-zone rate applies.'
      : 'Pickup and drop are in different zones — inter-zone rate applies.',
  );

  // 2. Volumetric weight — cm in, grams out; divisor from config, never inline.
  const volumeCm3 = input.lengthCm * input.breadthCm * input.heightCm;
  const volumetricWeightGrams = Math.ceil(
    (volumeCm3 * 1000) / pricingConfig.volumetricDivisor,
  );

  // 3. Chargeable weight: max(actual, volumetric) -> round UP to step -> floor.
  //    The order of these three operations matters and is fixed here: a single
  //    rounding happens now, so slab freight below is linear (no second round).
  const actual = input.actualWeightGrams;
  const basis: ChargeableBasisValue =
    volumetricWeightGrams > actual ? 'VOLUMETRIC' : 'ACTUAL';
  const rawChargeable = Math.max(actual, volumetricWeightGrams);
  const step = pricingConfig.weightRoundingStepGrams;
  const roundedToStep =
    step > 0 ? Math.ceil(rawChargeable / step) * step : rawChargeable;
  const chargeableWeightGrams = Math.max(
    roundedToStep,
    pricingConfig.minChargeableWeightGrams,
  );
  explain.push(
    `Volumetric ${kg(volumetricWeightGrams)} vs actual ${kg(actual)} — ` +
      `billing on ${basis.toLowerCase()} (${kg(rawChargeable)}), ` +
      `rounded up to ${kg(chargeableWeightGrams)}.`,
  );

  // 4. Rate card by (orderType, scope, zone pair, asOf), most specific wins.
  const card = selectRateCard(input, scope, config.rateCards);
  explain.push(
    `Rate card "${card.versionLabel ?? card.name}" selected for ` +
      `${input.orderType} ${scope.replace('_', ' ').toLowerCase()}.`,
  );

  // 5. Slab
  const slab = selectSlab(card, chargeableWeightGrams);
  const additionalGrams = chargeableWeightGrams - slab.fromWeightGrams;
  const freightPaise: Paise =
    slab.flatPaise + Math.round((additionalGrams * slab.perKgPaise) / 1000);
  explain.push(
    `Freight = ${formatINR(slab.flatPaise)} base + ` +
      `${kg(additionalGrams)} × ${formatINR(slab.perKgPaise)}/kg = ` +
      `${formatINR(freightPaise)}.`,
  );

  // 6. Fuel surcharge on freight only.
  const fuelSurchargePaise = percentOf(
    freightPaise,
    pricingConfig.fuelSurchargeBasisPoints,
  );
  if (fuelSurchargePaise > 0) {
    explain.push(
      `Fuel surcharge ${bp(pricingConfig.fuelSurchargeBasisPoints)} of freight = ` +
        `${formatINR(fuelSurchargePaise)}.`,
    );
  }

  // 7. Order-type surcharges (COD).
  const surcharges = computeSurcharges(input, freightPaise, config.surchargeRules);
  for (const s of surcharges) {
    explain.push(`${s.code}: ${formatINR(s.paise)} (${s.basis}).`);
  }

  // 8. Tax on the whole taxable base, applied last, one rounding step.
  const taxableBasePaise = sumPaise([
    freightPaise,
    fuelSurchargePaise,
    ...surcharges.map((s) => s.paise),
  ]);
  const taxPaise = percentOf(taxableBasePaise, pricingConfig.taxBasisPoints);
  const totalPaise = taxableBasePaise + taxPaise;
  explain.push(
    `Tax ${bp(pricingConfig.taxBasisPoints)} on ${formatINR(taxableBasePaise)} = ` +
      `${formatINR(taxPaise)}. Total ${formatINR(totalPaise)}.`,
  );

  return {
    scope,
    volumetricWeightGrams,
    chargeableWeightGrams,
    chargeableBasis: basis,
    rateCardId: card.id,
    rateCardVersionLabel: card.versionLabel ?? card.name,
    appliedSlabId: slab.id,
    freightPaise,
    fuelSurchargePaise,
    surcharges,
    taxableBasePaise,
    taxPaise,
    totalPaise,
    explain,
  };
}

// ── helpers ────────────────────────────────────────────────────────────────

function validateInput(input: PricingInput): void {
  for (const [label, v] of [
    ['lengthCm', input.lengthCm],
    ['breadthCm', input.breadthCm],
    ['heightCm', input.heightCm],
  ] as const) {
    if (!Number.isFinite(v) || v <= 0 || v > MAX_DIMENSION_CM) {
      throw new PricingError(
        'INVALID_DIMENSIONS',
        `${label} must be between 0 and ${MAX_DIMENSION_CM} cm, got ${v}`,
      );
    }
  }
  if (
    !Number.isFinite(input.actualWeightGrams) ||
    input.actualWeightGrams <= 0 ||
    input.actualWeightGrams > MAX_WEIGHT_GRAMS
  ) {
    throw new PricingError(
      'INVALID_WEIGHT',
      `actualWeightGrams must be between 0 and ${MAX_WEIGHT_GRAMS}, got ${input.actualWeightGrams}`,
    );
  }
}

/** Most-specific match: exact zone pair beats scope-level default; latest wins ties. */
function selectRateCard(
  input: PricingInput,
  scope: RateScopeValue,
  cards: RateCardData[],
): RateCardData {
  const asOf = input.asOf.getTime();
  const scored = cards
    .filter(
      (c) =>
        c.orderType === input.orderType &&
        c.scope === scope &&
        c.effectiveFrom.getTime() <= asOf &&
        (c.effectiveTo === null || asOf < c.effectiveTo.getTime()),
    )
    .map((c) => ({ card: c, specificity: zoneSpecificity(c, input) }))
    .filter((x) => x.specificity > 0)
    .sort(
      (a, b) =>
        b.specificity - a.specificity ||
        b.card.effectiveFrom.getTime() - a.card.effectiveFrom.getTime() ||
        a.card.id.localeCompare(b.card.id),
    );

  if (scored.length === 0) {
    throw new PricingError(
      'RATE_CARD_NOT_FOUND',
      `No active ${input.orderType} ${scope} rate card for ${input.pickupZoneId} → ${input.dropZoneId} as of ${input.asOf.toISOString()}`,
    );
  }
  return scored[0].card;
}

function zoneSpecificity(card: RateCardData, input: PricingInput): number {
  const exactPair =
    card.originZoneId === input.pickupZoneId &&
    card.destinationZoneId === input.dropZoneId;
  if (exactPair) return 2;
  if (card.originZoneId === null && card.destinationZoneId === null) return 1;
  return 0; // a card for some other specific pair does not apply
}

/**
 * Slab match: fromWeightGrams inclusive, toWeightGrams exclusive (null = open).
 * A weight exactly on a boundary falls into the upper slab, so ranges never
 * overlap. Tested on both edges.
 */
function selectSlab(card: RateCardData, weightGrams: number): RateSlabData {
  const slab = [...card.slabs]
    .sort((a, b) => a.fromWeightGrams - b.fromWeightGrams)
    .find(
      (s) =>
        weightGrams >= s.fromWeightGrams &&
        (s.toWeightGrams === null || weightGrams < s.toWeightGrams),
    );
  if (!slab) {
    throw new PricingError(
      'NO_SLAB_FOR_WEIGHT',
      `Rate card ${card.id} has no slab covering ${weightGrams} g`,
    );
  }
  return slab;
}

function computeSurcharges(
  input: PricingInput,
  freightPaise: Paise,
  rules: SurchargeRuleData[],
): SurchargeLine[] {
  if (input.paymentType !== 'COD') return [];
  const asOf = input.asOf.getTime();
  const rule = rules.find(
    (r) =>
      r.code === 'COD' &&
      r.orderType === input.orderType &&
      r.effectiveFrom.getTime() <= asOf &&
      (r.effectiveTo === null || asOf < r.effectiveTo.getTime()),
  );
  if (!rule) return [];

  const percent = percentOf(freightPaise, rule.percentBasisPoints ?? 0);
  const flat = rule.flatPaise ?? 0;
  let value: Paise;
  let basis: string;
  switch (rule.calcType) {
    case 'FLAT':
      value = flat;
      basis = `${formatINR(flat)} flat`;
      break;
    case 'PERCENT_OF_FREIGHT':
      value = percent;
      basis = `${bp(rule.percentBasisPoints ?? 0)} of freight`;
      break;
    case 'GREATER_OF':
      value = Math.max(flat, percent);
      basis = `greater of ${formatINR(flat)} flat and ${bp(
        rule.percentBasisPoints ?? 0,
      )} of freight`;
      break;
  }
  const clamped = clampPaise(value, rule.minPaise, rule.maxPaise);
  if (clamped !== value) basis += ` (clamped to ${formatINR(clamped)})`;
  return [{ code: rule.code, paise: clamped, basis }];
}

function kg(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}

function bp(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`;
}
