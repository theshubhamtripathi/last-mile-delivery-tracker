import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import { haversineKm } from '../../common/geo';

export type ZoneResolutionMethod = 'PINCODE' | 'GEO_FALLBACK';

export interface ZoneResolution {
  zoneId: string;
  method: ZoneResolutionMethod;
  serviceAreaId: string;
  distanceKm?: number;
}

// Radius for the geospatial fallback; kept modest so an unmapped pincode far
// from any serviceable area is rejected rather than mis-zoned.
const MAX_FALLBACK_RADIUS_KM = 60;

@Injectable()
export class ZoneResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Three strategies in order (charter §7): exact pincode lookup, then nearest
   * serviceable centroid by Haversine when coordinates are given, else reject
   * with ZONE_UNRESOLVED so an admin can map the pincode and the customer can
   * retry.
   */
  async resolve(
    pincode: string,
    lat?: number,
    lng?: number,
  ): Promise<ZoneResolution> {
    const exact = await this.prisma.serviceArea.findUnique({ where: { pincode } });
    if (exact && exact.isServiceable) {
      return { zoneId: exact.zoneId, method: 'PINCODE', serviceAreaId: exact.id };
    }

    if (typeof lat === 'number' && typeof lng === 'number') {
      const areas = await this.prisma.serviceArea.findMany({
        where: { isServiceable: true },
        select: { id: true, zoneId: true, centroidLat: true, centroidLng: true },
      });
      let best: { area: (typeof areas)[number]; km: number } | null = null;
      for (const area of areas) {
        const km = haversineKm(lat, lng, area.centroidLat, area.centroidLng);
        if (!best || km < best.km) best = { area, km };
      }
      if (best && best.km <= MAX_FALLBACK_RADIUS_KM) {
        return {
          zoneId: best.area.zoneId,
          method: 'GEO_FALLBACK',
          serviceAreaId: best.area.id,
          distanceKm: Math.round(best.km * 10) / 10,
        };
      }
    }

    throw new AppException(
      'ZONE_UNRESOLVED',
      `Pincode ${pincode} is not mapped to any serviceable zone`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { pincode },
    );
  }
}
