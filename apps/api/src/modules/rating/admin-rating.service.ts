import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  CreateRateCardDto,
  CreateSurchargeRuleDto,
  SimulateDto,
  UpdatePricingConfigDto,
} from '@lmd/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import { AuditService } from '../admin/audit.service';
import { RatingService } from './rating.service';

@Injectable()
export class AdminRatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rating: RatingService,
  ) {}

  listRateCards() {
    return this.prisma.rateCard.findMany({
      orderBy: [{ orderType: 'asc' }, { scope: 'asc' }, { effectiveFrom: 'desc' }],
      include: {
        slabs: { orderBy: { sequence: 'asc' } },
        originZone: { select: { code: true } },
        destinationZone: { select: { code: true } },
      },
    });
  }

  async createRateCard(dto: CreateRateCardDto, actorUserId: string) {
    if (dto.slabs.length === 0) {
      throw new AppException('RATE_CARD_NO_SLABS', 'A rate card needs at least one slab', HttpStatus.BAD_REQUEST);
    }
    const card = await this.prisma.rateCard.create({
      data: {
        name: dto.name,
        orderType: dto.orderType,
        scope: dto.scope,
        originZoneId: dto.originZoneId ?? null,
        destinationZoneId: dto.destinationZoneId ?? null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        slabs: {
          create: dto.slabs.map((s) => ({
            fromWeightGrams: s.fromWeightGrams,
            toWeightGrams: s.toWeightGrams ?? null,
            flatPaise: s.flatPaise,
            perKgPaise: s.perKgPaise,
            sequence: s.sequence,
          })),
        },
      },
      include: { slabs: true },
    });
    await this.audit.record(actorUserId, 'RateCard', card.id, 'CREATE', null, card);
    return card;
  }

  /**
   * Closing a rate-card version never mutates a placed order's charge: it sets
   * effectiveTo / isActive so future quotes stop using it, while orders keep
   * their frozen snapshot. This is the effective-dating guarantee.
   */
  async closeRateCard(id: string, actorUserId: string) {
    const before = await this.prisma.rateCard.findUnique({ where: { id } });
    if (!before) throw new AppException('RATE_CARD_NOT_FOUND', 'Rate card not found', HttpStatus.NOT_FOUND);
    const card = await this.prisma.rateCard.update({
      where: { id },
      data: { isActive: false, effectiveTo: new Date() },
    });
    await this.audit.record(actorUserId, 'RateCard', id, 'CLOSE', before, card);
    return card;
  }

  listSurcharges() {
    return this.prisma.surchargeRule.findMany({ orderBy: { code: 'asc' } });
  }

  async createSurcharge(dto: CreateSurchargeRuleDto, actorUserId: string) {
    const rule = await this.prisma.surchargeRule.create({
      data: {
        code: dto.code,
        orderType: dto.orderType,
        calcType: dto.calcType,
        flatPaise: dto.flatPaise ?? null,
        percentBasisPoints: dto.percentBasisPoints ?? null,
        minPaise: dto.minPaise ?? null,
        maxPaise: dto.maxPaise ?? null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      },
    });
    await this.audit.record(actorUserId, 'SurchargeRule', rule.id, 'CREATE', null, rule);
    return rule;
  }

  getActivePricingConfig() {
    return this.prisma.pricingConfig.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Editing pricing config creates a NEW effective-dated row and deactivates the
   * previous one, rather than mutating in place — so historical quotes/orders
   * remain reproducible against the config that was active when they were made.
   */
  async updatePricingConfig(dto: UpdatePricingConfigDto, actorUserId: string) {
    const current = await this.getActivePricingConfig();
    if (!current) throw new AppException('PRICING_CONFIG_NOT_FOUND', 'No active pricing config', HttpStatus.CONFLICT);

    const next = await this.prisma.$transaction(async (tx) => {
      await tx.pricingConfig.update({ where: { id: current.id }, data: { isActive: false } });
      return tx.pricingConfig.create({
        data: {
          volumetricDivisor: dto.volumetricDivisor ?? current.volumetricDivisor,
          weightRoundingStepGrams: dto.weightRoundingStepGrams ?? current.weightRoundingStepGrams,
          minChargeableWeightGrams: dto.minChargeableWeightGrams ?? current.minChargeableWeightGrams,
          fuelSurchargeBasisPoints: dto.fuelSurchargeBasisPoints ?? current.fuelSurchargeBasisPoints,
          taxBasisPoints: dto.taxBasisPoints ?? current.taxBasisPoints,
          roundingMode: 'UP',
          effectiveFrom: new Date(),
          isActive: true,
        },
      });
    });
    await this.audit.record(actorUserId, 'PricingConfig', next.id, 'SUPERSEDE', current, next);
    return next;
  }

  /** Dry-run pricing against the active config for the rate-card simulator. */
  simulate(dto: SimulateDto) {
    return this.rating.price({
      lengthCm: dto.lengthCm,
      breadthCm: dto.breadthCm,
      heightCm: dto.heightCm,
      actualWeightGrams: dto.actualWeightGrams,
      orderType: dto.orderType,
      paymentType: dto.paymentType ?? 'PREPAID',
      pickupZoneId: dto.pickupZoneId,
      dropZoneId: dto.dropZoneId,
      declaredValuePaise: dto.declaredValuePaise,
      asOf: new Date(),
    });
  }
}
