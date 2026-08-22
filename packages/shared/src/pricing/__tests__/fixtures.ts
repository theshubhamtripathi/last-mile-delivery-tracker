import type {
  PricingConfigBundle,
  PricingConfigData,
  RateCardData,
  SurchargeRuleData,
} from '../types';

export const ZONE_A = 'zone_a';
export const ZONE_B = 'zone_b';
export const ZONE_C = 'zone_c';

export const AS_OF = new Date('2026-06-01T00:00:00Z');

export const baseConfig: PricingConfigData = {
  id: 'cfg_1',
  volumetricDivisor: 5000,
  weightRoundingStepGrams: 500,
  roundingMode: 'UP',
  minChargeableWeightGrams: 500,
  fuelSurchargeBasisPoints: 800, // 8%
  taxBasisPoints: 1800, // 18% GST
  effectiveFrom: new Date('2026-01-01T00:00:00Z'),
};

const standardSlabs = (
  prefix: string,
  baseFlat: number,
  perKg: number,
) => [
  { id: `${prefix}_s0`, fromWeightGrams: 0, toWeightGrams: 500, flatPaise: baseFlat - 3000, perKgPaise: 0, sequence: 0 },
  { id: `${prefix}_s1`, fromWeightGrams: 500, toWeightGrams: 5000, flatPaise: baseFlat, perKgPaise: perKg, sequence: 1 },
  { id: `${prefix}_s2`, fromWeightGrams: 5000, toWeightGrams: null, flatPaise: baseFlat + 32000, perKgPaise: perKg - 2000, sequence: 2 },
];

// Scope-default cards (origin/dest null) for each orderType × scope.
export const cardB2CInter: RateCardData = {
  id: 'rc_b2c_inter', name: 'B2C Inter', orderType: 'B2C', scope: 'INTER_ZONE',
  originZoneId: null, destinationZoneId: null,
  effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
  versionLabel: 'B2C-INTER v1', slabs: standardSlabs('b2ci', 8000, 8000),
};
export const cardB2CIntra: RateCardData = {
  id: 'rc_b2c_intra', name: 'B2C Intra', orderType: 'B2C', scope: 'INTRA_ZONE',
  originZoneId: null, destinationZoneId: null,
  effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
  versionLabel: 'B2C-INTRA v1', slabs: standardSlabs('b2ca', 6000, 6000),
};
export const cardB2BInter: RateCardData = {
  id: 'rc_b2b_inter', name: 'B2B Inter', orderType: 'B2B', scope: 'INTER_ZONE',
  originZoneId: null, destinationZoneId: null,
  effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
  versionLabel: 'B2B-INTER v1', slabs: standardSlabs('b2bi', 10000, 7000),
};
export const cardB2BIntra: RateCardData = {
  id: 'rc_b2b_intra', name: 'B2B Intra', orderType: 'B2B', scope: 'INTRA_ZONE',
  originZoneId: null, destinationZoneId: null,
  effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
  versionLabel: 'B2B-INTRA v1', slabs: standardSlabs('b2ba', 7000, 5000),
};

// An exact zone-pair card (A→B) that should win over the scope default.
export const cardB2CInterPairAB: RateCardData = {
  id: 'rc_b2c_inter_ab', name: 'B2C Inter A→B', orderType: 'B2C', scope: 'INTER_ZONE',
  originZoneId: ZONE_A, destinationZoneId: ZONE_B,
  effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
  versionLabel: 'B2C-INTER-AB v1', slabs: standardSlabs('pair', 9000, 9000),
};

// A lapsed card proving effective dating: superseded before AS_OF.
export const cardB2CInterLapsed: RateCardData = {
  ...cardB2CInter, id: 'rc_b2c_inter_lapsed', versionLabel: 'B2C-INTER v0-lapsed',
  effectiveFrom: new Date('2025-01-01T00:00:00Z'),
  effectiveTo: new Date('2026-01-01T00:00:00Z'),
  slabs: standardSlabs('lapsed', 4000, 4000),
};

export const codB2C: SurchargeRuleData = {
  id: 'sc_cod_b2c', code: 'COD', orderType: 'B2C', calcType: 'GREATER_OF',
  flatPaise: 3500, percentBasisPoints: 200, minPaise: null, maxPaise: null,
  effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
};
export const codB2B: SurchargeRuleData = {
  id: 'sc_cod_b2b', code: 'COD', orderType: 'B2B', calcType: 'PERCENT_OF_FREIGHT',
  flatPaise: null, percentBasisPoints: 500, minPaise: 2000, maxPaise: 10000,
  effectiveFrom: new Date('2026-01-01T00:00:00Z'), effectiveTo: null,
};

export function bundle(
  overrides: Partial<PricingConfigBundle> = {},
): PricingConfigBundle {
  return {
    pricingConfig: baseConfig,
    rateCards: [
      cardB2CInter, cardB2CIntra, cardB2BInter, cardB2BIntra,
      cardB2CInterPairAB, cardB2CInterLapsed,
    ],
    surchargeRules: [codB2C, codB2B],
    ...overrides,
  };
}
