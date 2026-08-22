import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PricingResult, QuoteRequestDto } from '@lmd/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ZoneResolverService } from '../zones/zone-resolver.service';
import { RatingService } from './rating.service';

// A quote is valid for 15 minutes; POST /orders re-verifies against the live
// config and rejects with QUOTE_STALE if pricing changed underneath.
const QUOTE_TTL_MS = 15 * 60 * 1000;

export interface QuoteResponse {
  quoteToken: string;
  expiresAt: Date;
  pickupZoneId: string;
  dropZoneId: string;
  pickupZoneResolution: string;
  dropZoneResolution: string;
  breakdown: PricingResult;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly zones: ZoneResolverService,
    private readonly rating: RatingService,
  ) {}

  async create(dto: QuoteRequestDto): Promise<QuoteResponse> {
    const asOf = new Date();
    const [pickup, drop] = await Promise.all([
      this.zones.resolve(dto.pickupPincode, dto.pickupLat, dto.pickupLng),
      this.zones.resolve(dto.dropPincode, dto.dropLat, dto.dropLng),
    ]);

    const breakdown = await this.rating.price({
      lengthCm: dto.lengthCm,
      breadthCm: dto.breadthCm,
      heightCm: dto.heightCm,
      actualWeightGrams: dto.actualWeightGrams,
      orderType: dto.orderType,
      paymentType: dto.paymentType,
      pickupZoneId: pickup.zoneId,
      dropZoneId: drop.zoneId,
      declaredValuePaise: dto.declaredValuePaise,
      asOf,
    });

    const quoteToken = randomUUID();
    const expiresAt = new Date(asOf.getTime() + QUOTE_TTL_MS);

    // The snapshot captures both the inputs and the priced result so order
    // creation can prove the inputs are unchanged and freeze the same numbers.
    await this.prisma.orderQuote.create({
      data: {
        quoteToken,
        requestPayload: {
          ...dto,
          pickupZoneId: pickup.zoneId,
          dropZoneId: drop.zoneId,
        } as object,
        pricingSnapshot: breakdown as unknown as object,
        totalPaise: breakdown.totalPaise,
        expiresAt,
      },
    });

    return {
      quoteToken,
      expiresAt,
      pickupZoneId: pickup.zoneId,
      dropZoneId: drop.zoneId,
      pickupZoneResolution: pickup.method,
      dropZoneResolution: drop.method,
      breakdown,
    };
  }
}
