import type { Paise, BasisPoints } from '../money';

export type OrderTypeValue = 'B2B' | 'B2C';
export type PaymentTypeValue = 'PREPAID' | 'COD';
export type RateScopeValue = 'INTRA_ZONE' | 'INTER_ZONE';
export type ChargeableBasisValue = 'ACTUAL' | 'VOLUMETRIC';
export type SurchargeCalcValue = 'FLAT' | 'PERCENT_OF_FREIGHT' | 'GREATER_OF';

/** What the caller wants priced. `asOf` makes the calculator clock-free. */
export interface PricingInput {
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightGrams: number;
  orderType: OrderTypeValue;
  paymentType: PaymentTypeValue;
  pickupZoneId: string;
  dropZoneId: string;
  /** Declared consignment value in paise; recorded on the order for reference. */
  declaredValuePaise?: number;
  asOf: Date;
}

/** A snapshot of the active pricing configuration, loaded by the caller. */
export interface PricingConfigData {
  id: string;
  volumetricDivisor: number;
  weightRoundingStepGrams: number;
  roundingMode: 'UP';
  minChargeableWeightGrams: number;
  fuelSurchargeBasisPoints: BasisPoints;
  taxBasisPoints: BasisPoints;
  effectiveFrom: Date;
}

export interface RateSlabData {
  id: string;
  fromWeightGrams: number;
  /** null = open-ended top slab. */
  toWeightGrams: number | null;
  flatPaise: Paise;
  perKgPaise: Paise;
  sequence: number;
}

export interface RateCardData {
  id: string;
  name: string;
  orderType: OrderTypeValue;
  scope: RateScopeValue;
  originZoneId: string | null;
  destinationZoneId: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  slabs: RateSlabData[];
  /** Human-readable version label frozen onto the order, e.g. "B2C-INTER v2". */
  versionLabel?: string;
}

export interface SurchargeRuleData {
  id: string;
  code: string;
  orderType: OrderTypeValue;
  calcType: SurchargeCalcValue;
  flatPaise?: Paise | null;
  percentBasisPoints?: BasisPoints | null;
  minPaise?: Paise | null;
  maxPaise?: Paise | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface PricingConfigBundle {
  pricingConfig: PricingConfigData;
  rateCards: RateCardData[];
  surchargeRules: SurchargeRuleData[];
}

export interface SurchargeLine {
  code: string;
  paise: Paise;
  /** Plain-language basis, e.g. "greater of ₹35.00 flat and 2% of freight". */
  basis: string;
}

/** The full, first-class breakdown. Frozen onto the order as pricingSnapshot. */
export interface PricingResult {
  scope: RateScopeValue;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  chargeableBasis: ChargeableBasisValue;
  rateCardId: string;
  rateCardVersionLabel: string;
  appliedSlabId: string;
  freightPaise: Paise;
  fuelSurchargePaise: Paise;
  surcharges: SurchargeLine[];
  taxableBasePaise: Paise;
  taxPaise: Paise;
  totalPaise: Paise;
  /** Plain-language reasoning, rendered directly in the waybill panel. */
  explain: string[];
}
