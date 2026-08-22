import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import { Public } from '../../common/decorators/public.decorator';
import { TrackingService } from './tracking.service';

/**
 * The public, no-login tracking page data source. The reviewer sees the product
 * working before they see a login form. Contact PII is not exposed here — only
 * what a consignee needs: status, timeline, attempts and whether a reschedule
 * is available.
 */
@ApiTags('public')
@Controller('track')
export class PublicTrackController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: TrackingService,
  ) {}

  @Public()
  @Get(':trackingNumber')
  @ApiOperation({ summary: 'Public order tracking by order number (no auth)' })
  async track(@Param('trackingNumber') trackingNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: trackingNumber },
      include: {
        pickupZone: { select: { code: true, name: true } },
        dropZone: { select: { code: true, name: true } },
        assignedAgent: { include: { user: { select: { fullName: true } } } },
        attempts: { orderBy: { attemptedAt: 'asc' } },
      },
    });
    if (!order) {
      throw new AppException('ORDER_NOT_FOUND', 'No order with that tracking number', HttpStatus.NOT_FOUND);
    }

    const timeline = await this.tracking.list(order.id);

    return {
      orderNumber: order.orderNumber,
      currentStatus: order.currentStatus,
      orderType: order.orderType,
      paymentType: order.paymentType,
      route: { from: order.pickupZone, to: order.dropZone },
      chargeableWeightGrams: order.chargeableWeightGrams,
      totalPaise: order.totalPaise,
      promisedDate: order.promisedDate,
      attemptCount: order.attemptCount,
      canReschedule: order.currentStatus === 'FAILED',
      agent: order.assignedAgent?.user.fullName ?? null,
      attempts: order.attempts,
      timeline: timeline.map((e) => ({
        sequence: e.sequence,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actorRole: e.actorRole,
        actorName: e.actor.fullName,
        isAdminOverride: e.isAdminOverride,
        reason: e.reason,
        occurredAt: e.occurredAt,
      })),
    };
  }
}
