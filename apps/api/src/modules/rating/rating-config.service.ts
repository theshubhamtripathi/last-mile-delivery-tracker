import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  PricingConfigBundle,
  PricingConfigData,
  RateCardData,
  SurchargeRuleData,
} from '@lmd/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';

/**
 * Loads the effective pricing configuration from the database and maps the
 * Prisma rows onto the pure engine's plain data types. The engine itself never
 * touches Prisma — this is the only bridge, which keeps the calculator testable
 * in isolation and identical to the copy the browser runs.
 */
@Injectable()
export class RatingConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async loadBundle(asOf: Date): Promise<PricingConfigBundle> {
    const [pricingRow, cardRows, ruleRows] = await Promise.all([
      this.prisma.pricingConfig.findFirst({
        where: { isActive: true, effectiveFrom: { lte: asOf } },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.rateCard.findMany({
        where: { isActive: true },
        include: { slabs: { orderBy: { sequence: 'asc' } } },
      }),
      this.prisma.surchargeRule.findMany({ where: { isActive: true } }),
    ]);

    if (!pricingRow) {
      throw new AppException(
        'PRICING_CONFIG_NOT_FOUND',
        'No active pricing configuration is effective as of the requested time',
        HttpStatus.CONFLICT,
      );
    }

    const pricingConfig: PricingConfigData = {
      id: pricingRow.id,
      volumetricDivisor: pricingRow.volumetricDivisor,
      weightRoundingStepGrams: pricingRow.weightRoundingStepGrams,
      roundingMode: 'UP',
      minChargeableWeightGrams: pricingRow.minChargeableWeightGrams,
      fuelSurchargeBasisPoints: pricingRow.fuelSurchargeBasisPoints,
      taxBasisPoints: pricingRow.taxBasisPoints,
      effectiveFrom: pricingRow.effectiveFrom,
    };

    const rateCards: RateCardData[] = cardRows.map((c) => ({
      id: c.id,
      name: c.name,
      orderType: c.orderType,
      scope: c.scope,
      originZoneId: c.originZoneId,
      destinationZoneId: c.destinationZoneId,
      effectiveFrom: c.effectiveFrom,
      effectiveTo: c.effectiveTo,
      versionLabel: labelFor(c),
      slabs: c.slabs.map((s) => ({
        id: s.id,
        fromWeightGrams: s.fromWeightGrams,
        toWeightGrams: s.toWeightGrams,
        flatPaise: s.flatPaise,
        perKgPaise: s.perKgPaise,
        sequence: s.sequence,
      })),
    }));

    const surchargeRules: SurchargeRuleData[] = ruleRows.map((r) => ({
      id: r.id,
      code: r.code,
      orderType: r.orderType,
      calcType: r.calcType,
      flatPaise: r.flatPaise,
      percentBasisPoints: r.percentBasisPoints,
      minPaise: r.minPaise,
      maxPaise: r.maxPaise,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
    }));

    return { pricingConfig, rateCards, surchargeRules };
  }
}

function labelFor(card: {
  name: string;
  effectiveFrom: Date;
}): string {
  // A stable, human-readable version label frozen onto orders.
  return `${card.name} @ ${card.effectiveFrom.toISOString().slice(0, 10)}`;
}
