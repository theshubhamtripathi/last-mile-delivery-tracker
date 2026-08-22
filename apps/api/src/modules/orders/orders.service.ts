import { HttpStatus, Injectable } from '@nestjs/common';
import {
  computeCharge,
  type CreateOrderDto,
  type PricingResult,
} from '@lmd/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import type { AuthUser } from '../../common/types';
import { RatingConfigService } from '../rating/rating-config.service';
import { TrackingService } from '../tracking/tracking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { nextOrderNumber } from './order-number';

interface QuotePayload {
  pickupPincode: string;
  dropPincode: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightGrams: number;
  orderType: 'B2B' | 'B2C';
  paymentType: 'PREPAID' | 'COD';
  declaredValuePaise?: number;
  pickupZoneId: string;
  dropZoneId: string;
}

export interface OrderListFilters {
  status?: string;
  zoneId?: string;
  agentId?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingConfig: RatingConfigService,
    private readonly tracking: TrackingService,
    private readonly notifications: NotificationsService,
  ) {}

  async createFromQuote(dto: CreateOrderDto, actor: AuthUser) {
    const quote = await this.prisma.orderQuote.findUnique({
      where: { quoteToken: dto.quoteToken },
    });
    if (!quote) {
      throw new AppException('QUOTE_NOT_FOUND', 'Quote token not recognised', HttpStatus.NOT_FOUND);
    }
    if (quote.consumedByOrderId) {
      throw new AppException('QUOTE_ALREADY_USED', 'This quote has already been used', HttpStatus.CONFLICT);
    }
    if (quote.expiresAt.getTime() < Date.now()) {
      throw new AppException('QUOTE_EXPIRED', 'This quote has expired; request a new one', HttpStatus.CONFLICT);
    }

    const payload = quote.requestPayload as unknown as QuotePayload;

    // Address pincodes must match the quoted pincodes, else zones (and price) differ.
    if (
      dto.pickupAddress.pincode !== payload.pickupPincode ||
      dto.dropAddress.pincode !== payload.dropPincode
    ) {
      throw new AppException(
        'PINCODE_MISMATCH',
        'Address pincodes do not match the quoted pincodes',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Resolve the customer (admin may act on behalf of a customer).
    const customerId = await this.resolveCustomer(dto, actor);

    // Re-verify pricing against the live config. If the number moved, the quote
    // is stale — the guarantee behind "charge shown before confirmation".
    const asOf = new Date();
    const bundle = await this.ratingConfig.loadBundle(asOf);
    const breakdown: PricingResult = computeCharge(
      {
        lengthCm: payload.lengthCm,
        breadthCm: payload.breadthCm,
        heightCm: payload.heightCm,
        actualWeightGrams: payload.actualWeightGrams,
        orderType: payload.orderType,
        paymentType: payload.paymentType,
        pickupZoneId: payload.pickupZoneId,
        dropZoneId: payload.dropZoneId,
        declaredValuePaise: payload.declaredValuePaise,
        asOf,
      },
      bundle,
    );
    if (breakdown.totalPaise !== quote.totalPaise) {
      throw new AppException(
        'QUOTE_STALE',
        'Pricing changed since the quote was issued; request a new quote',
        HttpStatus.CONFLICT,
        { quotedPaise: quote.totalPaise, currentPaise: breakdown.totalPaise },
      );
    }

    const surchargePaise =
      breakdown.fuelSurchargePaise +
      breakdown.surcharges.reduce((sum, s) => sum + s.paise, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const pickup = await tx.address.create({ data: { ...toAddress(dto.pickupAddress), ownerUserId: customerId } });
      const drop = await tx.address.create({ data: { ...toAddress(dto.dropAddress), ownerUserId: customerId } });
      const orderNumber = await nextOrderNumber(tx, asOf);

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          createdByUserId: actor.userId,
          orderType: payload.orderType,
          paymentType: payload.paymentType,
          pickupAddressId: pickup.id,
          dropAddressId: drop.id,
          pickupZoneId: payload.pickupZoneId,
          dropZoneId: payload.dropZoneId,
          rateScope: breakdown.scope,
          lengthCm: payload.lengthCm,
          breadthCm: payload.breadthCm,
          heightCm: payload.heightCm,
          actualWeightGrams: payload.actualWeightGrams,
          volumetricWeightGrams: breakdown.volumetricWeightGrams,
          chargeableWeightGrams: breakdown.chargeableWeightGrams,
          chargeableBasis: breakdown.chargeableBasis,
          rateCardId: breakdown.rateCardId,
          pricingConfigId: bundle.pricingConfig.id,
          freightPaise: breakdown.freightPaise,
          surchargePaise,
          taxPaise: breakdown.taxPaise,
          totalPaise: breakdown.totalPaise,
          declaredValuePaise: payload.declaredValuePaise ?? 0,
          pricingSnapshot: breakdown as unknown as Prisma.InputJsonValue,
          promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
          currentStatus: 'CREATED',
        },
      });

      await this.tracking.appendWithinTx(tx, {
        orderId: created.id,
        fromStatus: null,
        toStatus: 'CREATED',
        actorUserId: actor.userId,
        actorRole: actor.role,
        metadata: { orderNumber, totalPaise: breakdown.totalPaise },
      });

      await tx.orderQuote.update({
        where: { id: quote.id },
        data: { consumedByOrderId: created.id },
      });

      await this.notifications.enqueueWithinTx(tx, {
        orderId: created.id,
        templateKey: 'ORDER_CONFIRMED',
        order: created,
      });

      return created;
    });

    return this.findOne(order.id, actor);
  }

  private async resolveCustomer(dto: CreateOrderDto, actor: AuthUser): Promise<string> {
    if (actor.role === 'ADMIN' && dto.onBehalfOfCustomerId) {
      const customer = await this.prisma.user.findUnique({ where: { id: dto.onBehalfOfCustomerId } });
      if (!customer || customer.role !== 'CUSTOMER') {
        throw new AppException('CUSTOMER_NOT_FOUND', 'Target customer not found', HttpStatus.NOT_FOUND);
      }
      return customer.id;
    }
    if (actor.role !== 'CUSTOMER') {
      throw new AppException(
        'CUSTOMER_REQUIRED',
        'Only a customer can place an order for themselves; admins must set onBehalfOfCustomerId',
        HttpStatus.BAD_REQUEST,
      );
    }
    return actor.userId;
  }

  async findOne(id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        pickupAddress: true,
        dropAddress: true,
        pickupZone: { select: { code: true, name: true } },
        dropZone: { select: { code: true, name: true } },
        customer: { select: { id: true, fullName: true, email: true } },
        assignedAgent: { include: { user: { select: { fullName: true } } } },
      },
    });
    if (!order) throw new AppException('ORDER_NOT_FOUND', 'Order not found', HttpStatus.NOT_FOUND);
    await this.assertCanView(order, actor);
    return order;
  }

  async list(filters: OrderListFilters, actor: AuthUser) {
    const where: Prisma.OrderWhereInput = {};

    // Role scoping.
    if (actor.role === 'CUSTOMER') {
      where.customerId = actor.userId;
    } else if (actor.role === 'AGENT') {
      const agent = await this.prisma.agent.findUnique({ where: { userId: actor.userId } });
      where.assignedAgentId = agent?.id ?? '__none__';
    }

    if (filters.status) where.currentStatus = filters.status as Prisma.OrderWhereInput['currentStatus'];
    if (filters.agentId && actor.role === 'ADMIN') where.assignedAgentId = filters.agentId;
    if (filters.zoneId) {
      where.OR = [{ pickupZoneId: filters.zoneId }, { dropZoneId: filters.zoneId }];
    }
    if (filters.q) where.orderNumber = { contains: filters.q, mode: 'insensitive' };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

    const [total, data] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          pickupZone: { select: { code: true } },
          dropZone: { select: { code: true } },
          customer: { select: { fullName: true } },
          assignedAgent: { include: { user: { select: { fullName: true } } } },
        },
      }),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  private async assertCanView(
    order: { customerId: string; assignedAgentId: string | null },
    actor: AuthUser,
  ): Promise<void> {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'CUSTOMER' && order.customerId === actor.userId) return;
    if (actor.role === 'AGENT' && order.assignedAgentId) {
      const agent = await this.prisma.agent.findUnique({ where: { userId: actor.userId } });
      if (agent && agent.id === order.assignedAgentId) return;
    }
    throw new AppException('FORBIDDEN', 'You do not have access to this order', HttpStatus.FORBIDDEN);
  }
}

function toAddress(a: CreateOrderDto['pickupAddress']) {
  return {
    line1: a.line1,
    line2: a.line2,
    landmark: a.landmark,
    pincode: a.pincode,
    city: a.city,
    state: a.state,
    contactName: a.contactName,
    contactPhone: a.contactPhone,
    lat: a.lat,
    lng: a.lng,
  };
}
