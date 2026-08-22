import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  CreateServiceAreaDto,
  CreateZoneDto,
  UpdateZoneDto,
} from '@lmd/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import { AuditService } from '../admin/audit.service';

@Injectable()
export class AdminZonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listZones() {
    return this.prisma.zone.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { serviceAreas: true } } },
    });
  }

  async createZone(dto: CreateZoneDto, actorUserId: string) {
    const existing = await this.prisma.zone.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new AppException(
        'ZONE_CODE_TAKEN',
        `Zone code ${dto.code} already exists`,
        HttpStatus.CONFLICT,
      );
    }
    const zone = await this.prisma.zone.create({ data: { name: dto.name, code: dto.code } });
    await this.audit.record(actorUserId, 'Zone', zone.id, 'CREATE', null, zone);
    return zone;
  }

  async updateZone(id: string, dto: UpdateZoneDto, actorUserId: string) {
    const before = await this.prisma.zone.findUnique({ where: { id } });
    if (!before) throw new AppException('ZONE_NOT_FOUND', 'Zone not found', HttpStatus.NOT_FOUND);
    const zone = await this.prisma.zone.update({ where: { id }, data: dto });
    await this.audit.record(actorUserId, 'Zone', id, 'UPDATE', before, zone);
    return zone;
  }

  listAreas(zoneId?: string) {
    return this.prisma.serviceArea.findMany({
      where: zoneId ? { zoneId } : undefined,
      orderBy: { pincode: 'asc' },
      include: { zone: { select: { code: true, name: true } } },
    });
  }

  async createArea(dto: CreateServiceAreaDto, actorUserId: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) throw new AppException('ZONE_NOT_FOUND', 'Target zone not found', HttpStatus.NOT_FOUND);
    const existing = await this.prisma.serviceArea.findUnique({ where: { pincode: dto.pincode } });
    if (existing) {
      throw new AppException(
        'PINCODE_TAKEN',
        `Pincode ${dto.pincode} is already mapped`,
        HttpStatus.CONFLICT,
      );
    }
    const area = await this.prisma.serviceArea.create({
      data: {
        name: dto.name,
        pincode: dto.pincode,
        city: dto.city,
        state: dto.state,
        zoneId: dto.zoneId,
        centroidLat: dto.centroidLat,
        centroidLng: dto.centroidLng,
        isServiceable: dto.isServiceable ?? true,
      },
    });
    await this.audit.record(actorUserId, 'ServiceArea', area.id, 'CREATE', null, area);
    return area;
  }
}
