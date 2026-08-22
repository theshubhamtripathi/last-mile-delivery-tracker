import { computeCharge } from '../compute';
import { PricingError } from '../errors';
import type { PricingInput } from '../types';
import {
  AS_OF,
  ZONE_A,
  ZONE_B,
  ZONE_C,
  baseConfig,
  bundle,
  cardB2CInterLapsed,
} from './fixtures';

function input(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    lengthCm: 30,
    breadthCm: 20,
    heightCm: 15,
    actualWeightGrams: 1200,
    orderType: 'B2C',
    paymentType: 'COD',
    pickupZoneId: ZONE_A,
    dropZoneId: ZONE_C, // A→C: not the exact A→B pair, so scope-default card wins
    declaredValuePaise: 150000,
    asOf: AS_OF,
    ...overrides,
  };
}

describe('computeCharge — README worked example', () => {
  it('prices the canonical parcel to ₹296.18 to the paisa', () => {
    const r = computeCharge(input(), bundle());
    expect(r.scope).toBe('INTER_ZONE');
    expect(r.volumetricWeightGrams).toBe(1800);
    expect(r.chargeableBasis).toBe('VOLUMETRIC');
    expect(r.chargeableWeightGrams).toBe(2000);
    expect(r.freightPaise).toBe(20000); // ₹200.00
    expect(r.fuelSurchargePaise).toBe(1600); // 8%
    expect(r.surcharges).toEqual([
      expect.objectContaining({ code: 'COD', paise: 3500 }),
    ]);
    expect(r.taxableBasePaise).toBe(25100);
    expect(r.taxPaise).toBe(4518); // 18% GST
    expect(r.totalPaise).toBe(29618); // ₹296.18
    expect(r.explain.length).toBeGreaterThan(3);
  });
});

describe('computeCharge — chargeable basis', () => {
  it('bills on actual when actual exceeds volumetric', () => {
    const r = computeCharge(
      input({ lengthCm: 10, breadthCm: 10, heightCm: 10, actualWeightGrams: 3000, paymentType: 'PREPAID' }),
      bundle(),
    );
    expect(r.chargeableBasis).toBe('ACTUAL');
    expect(r.chargeableWeightGrams).toBe(3000);
    expect(r.freightPaise).toBe(28000); // 8000 + 2.5kg×8000
    expect(r.totalPaise).toBe(35683);
  });

  it('bills on volumetric when it exceeds actual', () => {
    const r = computeCharge(input({ paymentType: 'PREPAID' }), bundle());
    expect(r.chargeableBasis).toBe('VOLUMETRIC');
  });

  it('breaks an exact tie in favour of actual', () => {
    // 20×25×20 = 10000 cm³ → volumetric 2000 g; actual 2000 g.
    const r = computeCharge(
      input({ lengthCm: 20, breadthCm: 25, heightCm: 20, actualWeightGrams: 2000, paymentType: 'PREPAID' }),
      bundle(),
    );
    expect(r.volumetricWeightGrams).toBe(2000);
    expect(r.chargeableBasis).toBe('ACTUAL');
  });
});

describe('computeCharge — slab boundaries', () => {
  it('applies the standard slab at its lower (from) edge', () => {
    const r = computeCharge(
      input({ lengthCm: 5, breadthCm: 5, heightCm: 5, actualWeightGrams: 100, paymentType: 'PREPAID' }),
      bundle(),
    );
    expect(r.chargeableWeightGrams).toBe(500); // min + rounding
    expect(r.appliedSlabId).toBe('b2ci_s1');
    expect(r.freightPaise).toBe(8000); // flat only, no additional weight
  });

  it('sends a weight exactly on the upper (to) edge into the open top slab', () => {
    const r = computeCharge(
      input({ lengthCm: 5, breadthCm: 5, heightCm: 5, actualWeightGrams: 5000, paymentType: 'PREPAID' }),
      bundle(),
    );
    expect(r.chargeableWeightGrams).toBe(5000);
    expect(r.appliedSlabId).toBe('b2ci_s2'); // exclusive upper bound
    expect(r.freightPaise).toBe(40000);
  });

  it('prices a heavy shipment on the open-ended top slab', () => {
    const r = computeCharge(
      input({ lengthCm: 5, breadthCm: 5, heightCm: 5, actualWeightGrams: 8000, paymentType: 'PREPAID' }),
      bundle(),
    );
    expect(r.appliedSlabId).toBe('b2ci_s2');
    expect(r.freightPaise).toBe(58000); // 40000 + 3kg×6000
  });

  it('throws NO_SLAB_FOR_WEIGHT when no slab covers the weight', () => {
    const custom = bundle({
      rateCards: [
        {
          id: 'rc_gap', name: 'Gap', orderType: 'B2C', scope: 'INTER_ZONE',
          originZoneId: null, destinationZoneId: null,
          effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
          slabs: [{ id: 'gap_s', fromWeightGrams: 1000, toWeightGrams: null, flatPaise: 5000, perKgPaise: 5000, sequence: 0 }],
        },
      ],
    });
    expect(() =>
      computeCharge(
        input({ lengthCm: 5, breadthCm: 5, heightCm: 5, actualWeightGrams: 100, paymentType: 'PREPAID' }),
        custom,
      ),
    ).toThrow(PricingError);
  });
});

describe('computeCharge — scope and order type', () => {
  it('prices intra-zone lower than inter-zone at identical weight', () => {
    const inter = computeCharge(input({ paymentType: 'PREPAID' }), bundle());
    const intra = computeCharge(
      input({ paymentType: 'PREPAID', dropZoneId: ZONE_A }),
      bundle(),
    );
    expect(intra.scope).toBe('INTRA_ZONE');
    expect(intra.freightPaise).toBe(15000); // 6000 + 1.5kg×6000
    expect(intra.freightPaise).toBeLessThan(inter.freightPaise);
  });

  it('diverges between B2B and B2C at the same weight', () => {
    const b2c = computeCharge(input({ paymentType: 'PREPAID' }), bundle());
    const b2b = computeCharge(
      input({ paymentType: 'PREPAID', orderType: 'B2B' }),
      bundle(),
    );
    expect(b2c.freightPaise).toBe(20000);
    expect(b2b.freightPaise).toBe(20500); // 10000 + 1.5kg×7000
    expect(b2b.freightPaise).not.toBe(b2c.freightPaise);
  });
});

describe('computeCharge — rate card selection', () => {
  it('prefers an exact zone-pair card over the scope default', () => {
    const r = computeCharge(
      input({ paymentType: 'PREPAID', dropZoneId: ZONE_B }), // A→B exact pair exists
      bundle(),
    );
    expect(r.rateCardId).toBe('rc_b2c_inter_ab');
  });

  it('throws RATE_CARD_NOT_FOUND when the only card has lapsed', () => {
    const custom = bundle({ rateCards: [cardB2CInterLapsed] });
    expect(() => computeCharge(input(), custom)).toThrow(
      expect.objectContaining({ code: 'RATE_CARD_NOT_FOUND' }),
    );
  });

  it('throws RATE_CARD_NOT_FOUND when there are no cards', () => {
    expect(() => computeCharge(input(), bundle({ rateCards: [] }))).toThrow(
      expect.objectContaining({ code: 'RATE_CARD_NOT_FOUND' }),
    );
  });

  it('ignores a card that is not yet effective', () => {
    const future = bundle({
      rateCards: [
        {
          id: 'rc_future', name: 'Future', orderType: 'B2C', scope: 'INTER_ZONE',
          originZoneId: null, destinationZoneId: null,
          effectiveFrom: new Date('2027-01-01T00:00:00Z'), effectiveTo: null,
          slabs: [{ id: 'f_s', fromWeightGrams: 0, toWeightGrams: null, flatPaise: 1, perKgPaise: 1, sequence: 0 }],
        },
      ],
    });
    expect(() => computeCharge(input(), future)).toThrow(
      expect.objectContaining({ code: 'RATE_CARD_NOT_FOUND' }),
    );
  });
});

describe('computeCharge — COD surcharge', () => {
  it('applies COD as the greater of flat and percent, floored by flat', () => {
    const r = computeCharge(input(), bundle());
    expect(r.surcharges[0]).toMatchObject({ code: 'COD', paise: 3500 });
    expect(r.surcharges[0].basis).toContain('greater of');
  });

  it('picks the percent when it beats the flat floor', () => {
    // B2C GREATER_OF, heavy freight so 2% > ₹35.
    const r = computeCharge(
      input({ lengthCm: 5, breadthCm: 5, heightCm: 5, actualWeightGrams: 50000 }),
      bundle(),
    );
    expect(r.freightPaise).toBe(310000);
    expect(r.surcharges[0].paise).toBe(6200); // 2% of ₹3100.00
  });

  it('applies a flat COD rule', () => {
    const flatRule = bundle({
      surchargeRules: [
        { id: 'sc_flat', code: 'COD', orderType: 'B2C', calcType: 'FLAT', flatPaise: 4000, percentBasisPoints: null, minPaise: null, maxPaise: null, effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null },
      ],
    });
    const r = computeCharge(input(), flatRule);
    expect(r.surcharges[0]).toMatchObject({ paise: 4000 });
    expect(r.surcharges[0].basis).toContain('flat');
  });

  it('clamps a percent COD at its floor (min)', () => {
    const r = computeCharge(input({ orderType: 'B2B' }), bundle());
    // B2B PERCENT 5% of ₹205.00 = ₹10.25 → below ₹20 floor → ₹20.00
    expect(r.freightPaise).toBe(20500);
    expect(r.surcharges[0].paise).toBe(2000);
    expect(r.surcharges[0].basis).toContain('clamped');
  });

  it('clamps a percent COD at its ceiling (max)', () => {
    const r = computeCharge(
      input({ orderType: 'B2B', lengthCm: 5, breadthCm: 5, heightCm: 5, actualWeightGrams: 50000 }),
      bundle(),
    );
    expect(r.freightPaise).toBe(267000);
    expect(r.surcharges[0].paise).toBe(10000); // 5% = ₹133.50 → capped at ₹100.00
    expect(r.surcharges[0].basis).toContain('clamped');
  });

  it('adds nothing for a prepaid order', () => {
    const r = computeCharge(input({ paymentType: 'PREPAID' }), bundle());
    expect(r.surcharges).toEqual([]);
  });

  it('adds nothing when COD has no matching rule for the order type', () => {
    const r = computeCharge(input(), bundle({ surchargeRules: [] }));
    expect(r.surcharges).toEqual([]);
  });
});

describe('computeCharge — rounding, min weight, fuel and tax', () => {
  const prepaid = { paymentType: 'PREPAID' as const, lengthCm: 5, breadthCm: 5, heightCm: 5 };

  it.each([
    [1499, 1500],
    [1500, 1500],
    [1501, 2000],
    [1999, 2000],
    [2000, 2000],
    [2001, 2500],
  ])('rounds actual %d g up to the %d g step', (actual, expected) => {
    const r = computeCharge(input({ ...prepaid, actualWeightGrams: actual }), bundle());
    expect(r.chargeableWeightGrams).toBe(expected);
  });

  it('applies the minimum chargeable weight after rounding', () => {
    const cfg = bundle({ pricingConfig: { ...baseConfig, minChargeableWeightGrams: 1000 } });
    const r = computeCharge(input({ ...prepaid, actualWeightGrams: 100 }), cfg);
    expect(r.chargeableWeightGrams).toBe(1000);
  });

  it('omits fuel surcharge when the configured rate is zero', () => {
    const cfg = bundle({ pricingConfig: { ...baseConfig, fuelSurchargeBasisPoints: 0 } });
    const r = computeCharge(input({ ...prepaid, actualWeightGrams: 1200 }), cfg);
    expect(r.fuelSurchargePaise).toBe(0);
    expect(r.explain.some((l) => l.toLowerCase().includes('fuel'))).toBe(false);
  });

  it('adds no tax when the configured tax rate is zero', () => {
    const cfg = bundle({ pricingConfig: { ...baseConfig, taxBasisPoints: 0 } });
    const r = computeCharge(input({ ...prepaid, actualWeightGrams: 1200 }), cfg);
    expect(r.taxPaise).toBe(0);
    expect(r.totalPaise).toBe(r.taxableBasePaise);
  });
});

describe('computeCharge — input and config validation', () => {
  it.each([
    ['zero length', { lengthCm: 0 }],
    ['negative breadth', { breadthCm: -5 }],
    ['absurd height', { heightCm: 2000 }],
  ])('rejects %s with INVALID_DIMENSIONS', (_label, override) => {
    expect(() => computeCharge(input(override), bundle())).toThrow(
      expect.objectContaining({ code: 'INVALID_DIMENSIONS' }),
    );
  });

  it.each([
    ['zero weight', 0],
    ['negative weight', -10],
    ['absurd weight', 20_000_000],
  ])('rejects %s with INVALID_WEIGHT', (_label, w) => {
    expect(() => computeCharge(input({ actualWeightGrams: w }), bundle())).toThrow(
      expect.objectContaining({ code: 'INVALID_WEIGHT' }),
    );
  });

  it('rejects a non-positive volumetric divisor with CONFIG_INVALID', () => {
    const cfg = bundle({ pricingConfig: { ...baseConfig, volumetricDivisor: 0 } });
    expect(() => computeCharge(input(), cfg)).toThrow(
      expect.objectContaining({ code: 'CONFIG_INVALID' }),
    );
  });
});

describe('computeCharge — remaining branches', () => {
  const prepaid = { paymentType: 'PREPAID' as const, lengthCm: 5, breadthCm: 5, heightCm: 5 };

  it('does not round when the step is zero', () => {
    const cfg = bundle({ pricingConfig: { ...baseConfig, weightRoundingStepGrams: 0 } });
    const r = computeCharge(input({ ...prepaid, actualWeightGrams: 1234 }), cfg);
    expect(r.chargeableWeightGrams).toBe(1234);
  });

  it('falls back to the card name when no version label is set', () => {
    const noLabel = bundle({
      rateCards: [
        {
          id: 'rc_plain', name: 'Plain Card', orderType: 'B2C', scope: 'INTER_ZONE',
          originZoneId: null, destinationZoneId: null,
          effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
          slabs: [{ id: 'p_s', fromWeightGrams: 0, toWeightGrams: null, flatPaise: 5000, perKgPaise: 4000, sequence: 0 }],
        },
      ],
    });
    const r = computeCharge(input({ ...prepaid, actualWeightGrams: 1200 }), noLabel);
    expect(r.rateCardVersionLabel).toBe('Plain Card');
  });

  it('formats a fractional percent and honours a set effectiveTo window', () => {
    const cfg = bundle({
      surchargeRules: [
        { id: 'sc_pct', code: 'COD', orderType: 'B2C', calcType: 'PERCENT_OF_FREIGHT', flatPaise: null, percentBasisPoints: 250, minPaise: null, maxPaise: null, effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: new Date('2027-01-01T00:00:00Z') },
      ],
    });
    const r = computeCharge(input(), cfg);
    expect(r.surcharges[0].paise).toBe(500); // 2.5% of ₹200.00
    expect(r.surcharges[0].basis).toContain('2.50%');
  });

  it('ignores a COD rule whose effectiveTo has passed', () => {
    const cfg = bundle({
      surchargeRules: [
        { id: 'sc_old', code: 'COD', orderType: 'B2C', calcType: 'FLAT', flatPaise: 9900, percentBasisPoints: null, minPaise: null, maxPaise: null, effectiveFrom: new Date('2025-01-01T00:00:00Z'), effectiveTo: new Date('2026-01-01T00:00:00Z') },
      ],
    });
    const r = computeCharge(input(), cfg);
    expect(r.surcharges).toEqual([]);
  });

  it('breaks a rate-card tie on the later effectiveFrom', () => {
    const openTop = (id: string, flat: number, from: string) => ({
      id, name: id, orderType: 'B2C' as const, scope: 'INTER_ZONE' as const,
      originZoneId: null, destinationZoneId: null,
      effectiveFrom: new Date(from), effectiveTo: null,
      slabs: [{ id: `${id}_s`, fromWeightGrams: 0, toWeightGrams: null, flatPaise: flat, perKgPaise: 0, sequence: 0 }],
    });
    const cfg = bundle({
      rateCards: [openTop('rc_old', 1000, '2026-01-01T00:00:00Z'), openTop('rc_new', 2000, '2026-03-01T00:00:00Z')],
    });
    const r = computeCharge(input({ paymentType: 'PREPAID' }), cfg);
    expect(r.rateCardId).toBe('rc_new'); // newer effective card wins
  });

  it('breaks a full tie deterministically on the card id', () => {
    const same = '2026-01-01T00:00:00Z';
    const openTop = (id: string, flat: number) => ({
      id, name: id, orderType: 'B2C' as const, scope: 'INTER_ZONE' as const,
      originZoneId: null, destinationZoneId: null,
      effectiveFrom: new Date(same), effectiveTo: null,
      slabs: [{ id: `${id}_s`, fromWeightGrams: 0, toWeightGrams: null, flatPaise: flat, perKgPaise: 0, sequence: 0 }],
    });
    const cfg = bundle({ rateCards: [openTop('rc_bbb', 2000), openTop('rc_aaa', 1000)] });
    const r = computeCharge(input({ paymentType: 'PREPAID' }), cfg);
    expect(r.rateCardId).toBe('rc_aaa'); // ascending id is the reproducible tiebreak
  });

  it('treats a PERCENT_OF_FREIGHT rule with no percent as zero', () => {
    const cfg = bundle({
      surchargeRules: [
        { id: 'sc_p0', code: 'COD', orderType: 'B2C', calcType: 'PERCENT_OF_FREIGHT', flatPaise: null, percentBasisPoints: null, minPaise: null, maxPaise: null, effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null },
      ],
    });
    const r = computeCharge(input(), cfg);
    expect(r.surcharges[0].paise).toBe(0);
  });

  it('handles GREATER_OF when no percent is configured', () => {
    const cfg = bundle({
      surchargeRules: [
        { id: 'sc_g', code: 'COD', orderType: 'B2C', calcType: 'GREATER_OF', flatPaise: 2500, percentBasisPoints: null, minPaise: null, maxPaise: null, effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null },
      ],
    });
    const r = computeCharge(input(), cfg);
    expect(r.surcharges[0].paise).toBe(2500);
  });
});
