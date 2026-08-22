import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import { haversineKm } from '../../common/geo';
import type { AuthUser } from '../../common/types';
import { TrackingService } from '../tracking/tracking.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AssignmentService } from './assignment.service';

interface Candidate {
  agentId: string;
  agentCode: string;
  distanceKm: number;
  usedLiveLocation: boolean;
  loadRatio: number;
  stalenessRatio: number;
  score: number;
}

interface Rejected {
  agentId: string;
  agentCode: string;
  reason: string;
}

/**
 * Deterministic, explainable, race-safe auto-assignment (charter §8). Weights
 * live in AssignmentConfig, never in code. Every candidate's score components
 * and every rejection reason are persisted so the admin "why this agent" panel
 * can render the decision. Ties break on agentCode so demos are reproducible.
 */
@Injectable()
export class AutoAssignmentService extends AssignmentService {
  constructor(
    prisma: PrismaService,
    tracking: TrackingService,
    notifications: NotificationsService,
  ) {
    super(prisma, tracking, notifications);
  }

  async autoAssign(orderId: string, actor: AuthUser) {
    return this.runAuto(orderId, actor, 'AUTO');
  }

  /** Reassignment after a failed attempt, excluding the agent who failed. */
  async reassignAfterFailure(orderId: string, actor: AuthUser) {
    return this.runAuto(orderId, actor, 'REASSIGN_AFTER_FAILURE');
  }

  private async runAuto(
    orderId: string,
    actor: AuthUser,
    strategy: 'AUTO' | 'REASSIGN_AFTER_FAILURE',
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { pickupAddress: true },
    });
    if (!order) throw new AppException('ORDER_NOT_FOUND', 'Order not found', HttpStatus.NOT_FOUND);

    const config =
      (await this.prisma.assignmentConfig.findFirst({ where: { isActive: true } })) ??
      null;
    if (!config) throw new AppException('ASSIGN_CONFIG_MISSING', 'No active assignment config', HttpStatus.CONFLICT);

    const pickup = await this.resolvePickupCoords(order.pickupZoneId, order.pickupAddress);

    // Agents who already failed an attempt on this order are excluded.
    const failed = await this.prisma.deliveryAttempt.findMany({
      where: { orderId, outcome: 'FAILED' },
      select: { agentId: true },
    });
    const excluded = new Set(failed.map((f) => f.agentId));

    const agents = await this.prisma.agent.findMany({
      include: { user: { select: { fullName: true } } },
    });

    const maxRadius = config.maxAssignRadiusKm;
    const candidates: Candidate[] = [];
    const rejected: Rejected[] = [];

    for (const a of agents) {
      if (excluded.has(a.id)) {
        rejected.push({ agentId: a.id, agentCode: a.agentCode, reason: 'FAILED_PREVIOUS_ATTEMPT' });
        continue;
      }
      if (a.availability !== 'AVAILABLE') {
        rejected.push({ agentId: a.id, agentCode: a.agentCode, reason: `NOT_AVAILABLE (${a.availability})` });
        continue;
      }
      if (a.activeOrderCount >= a.maxConcurrentOrders) {
        rejected.push({ agentId: a.id, agentCode: a.agentCode, reason: 'AT_CAPACITY' });
        continue;
      }

      const hasLive = a.currentLat != null && a.currentLng != null;
      const agentPoint = hasLive
        ? { lat: a.currentLat as number, lng: a.currentLng as number }
        : await this.resolvePickupCoords(a.homeZoneId, null);
      const distanceKm = haversineKm(agentPoint.lat, agentPoint.lng, pickup.lat, pickup.lng);

      const inZone = a.homeZoneId === order.pickupZoneId;
      if (!inZone && distanceKm > maxRadius) {
        rejected.push({ agentId: a.id, agentCode: a.agentCode, reason: `OUT_OF_RANGE (${distanceKm.toFixed(1)}km)` });
        continue;
      }

      // Score components, each normalised to [0,1]; lower total wins.
      const normDistance = Math.min(distanceKm / Math.max(maxRadius, 1), 1);
      const loadRatio = a.activeOrderCount / a.maxConcurrentOrders;
      const ageMin = a.locationUpdatedAt
        ? (Date.now() - a.locationUpdatedAt.getTime()) / 60000
        : 24 * 60;
      const stalenessRatio = Math.min(ageMin / (24 * 60), 1);
      const noLocationPenalty = hasLive ? 0 : config.noLocationPenaltyMilli / 1000;

      const score =
        (config.wDistance * normDistance +
          config.wLoad * loadRatio +
          config.wStaleness * stalenessRatio) /
          100 +
        noLocationPenalty;

      candidates.push({
        agentId: a.id,
        agentCode: a.agentCode,
        distanceKm: Math.round(distanceKm * 10) / 10,
        usedLiveLocation: hasLive,
        loadRatio: Math.round(loadRatio * 100) / 100,
        stalenessRatio: Math.round(stalenessRatio * 100) / 100,
        score: Math.round(score * 10000) / 10000,
      });
    }

    candidates.sort((a, b) => a.score - b.score || a.agentCode.localeCompare(b.agentCode));

    const snapshot = {
      pickup,
      weights: { wDistance: config.wDistance, wLoad: config.wLoad, wStaleness: config.wStaleness },
      candidates,
      rejected,
    } as unknown as Prisma.InputJsonValue;

    if (candidates.length === 0) {
      // Structured reason rather than null, so the admin sees why.
      const reason = rejected.some((r) => r.reason === 'AT_CAPACITY')
        ? 'ALL_AT_CAPACITY'
        : 'NO_AGENT_IN_ZONE';
      await this.prisma.assignmentLog.create({
        data: { orderId, strategy, candidateSnapshot: snapshot, selectionReason: reason, assignedByUserId: actor.userId },
      });
      throw new AppException(reason, `Auto-assignment found no eligible agent (${reason})`, HttpStatus.CONFLICT, snapshot);
    }

    const winner = candidates[0];
    const reason =
      `Chosen ${winner.agentCode}: score ${winner.score} ` +
      `(distance ${winner.distanceKm}km, load ${winner.loadRatio}, staleness ${winner.stalenessRatio}` +
      `${winner.usedLiveLocation ? '' : ', home-zone fallback'}).`;

    return this.commitAssignment(orderId, winner.agentId, actor, strategy, reason, snapshot);
  }

  /** A representative point for a zone: the address coords, else a zone centroid. */
  private async resolvePickupCoords(
    zoneId: string,
    address: { lat: number | null; lng: number | null; pincode?: string } | null,
  ): Promise<{ lat: number; lng: number }> {
    if (address?.lat != null && address.lng != null) {
      return { lat: address.lat, lng: address.lng };
    }
    if (address?.pincode) {
      const area = await this.prisma.serviceArea.findUnique({ where: { pincode: address.pincode } });
      if (area) return { lat: area.centroidLat, lng: area.centroidLng };
    }
    const any = await this.prisma.serviceArea.findFirst({ where: { zoneId } });
    if (any) return { lat: any.centroidLat, lng: any.centroidLng };
    throw new AppException('ZONE_HAS_NO_AREA', 'Zone has no service area to locate', HttpStatus.CONFLICT);
  }
}
