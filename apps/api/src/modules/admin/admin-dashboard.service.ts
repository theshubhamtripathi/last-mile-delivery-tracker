import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Agents with their user + zone, for the manual-assignment picker. */
  listAgents() {
    return this.prisma.agent.findMany({
      orderBy: { agentCode: 'asc' },
      include: { user: { select: { fullName: true } }, homeZone: { select: { code: true } } },
    });
  }

  /** Numbers behind the admin dashboard (rendered as hand-rolled SVG bars). */
  async metrics() {
    const [byStatus, byPickupZone, agents, delivered, totalOrders, attempts] =
      await Promise.all([
        this.prisma.order.groupBy({ by: ['currentStatus'], _count: { _all: true } }),
        this.prisma.order.groupBy({ by: ['pickupZoneId'], _count: { _all: true } }),
        this.prisma.agent.findMany({
          include: { user: { select: { fullName: true } }, homeZone: { select: { code: true } } },
        }),
        this.prisma.order.aggregate({
          where: { currentStatus: 'DELIVERED' },
          _sum: { totalPaise: true },
          _count: { _all: true },
        }),
        this.prisma.order.count(),
        this.prisma.deliveryAttempt.groupBy({ by: ['outcome'], _count: { _all: true } }),
      ]);

    const zones = await this.prisma.zone.findMany({ select: { id: true, code: true } });
    const zoneCode = new Map(zones.map((z) => [z.id, z.code]));

    const failedAttempts = attempts.find((a) => a.outcome === 'FAILED')?._count._all ?? 0;
    const totalAttempts = attempts.reduce((s, a) => s + a._count._all, 0);

    return {
      ordersByStatus: byStatus.map((r) => ({ status: r.currentStatus, count: r._count._all })),
      zoneLoad: byPickupZone.map((r) => ({
        zone: zoneCode.get(r.pickupZoneId) ?? r.pickupZoneId,
        count: r._count._all,
      })),
      agentUtilisation: agents.map((a) => ({
        agentCode: a.agentCode,
        name: a.user.fullName,
        homeZone: a.homeZone.code,
        availability: a.availability,
        activeOrderCount: a.activeOrderCount,
        maxConcurrentOrders: a.maxConcurrentOrders,
        utilisation: Math.round((a.activeOrderCount / a.maxConcurrentOrders) * 100) / 100,
      })),
      totals: {
        totalOrders,
        deliveredOrders: delivered._count._all,
        deliveredRevenuePaise: delivered._sum.totalPaise ?? 0,
        failureRate: totalAttempts === 0 ? 0 : Math.round((failedAttempts / totalAttempts) * 100) / 100,
      },
    };
  }
}
