import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateAvailabilityDto, UpdateLocationDto } from '@lmd/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/errors/app-exception';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';

@ApiTags('agents')
@Roles('AGENT')
@Controller('agents/me')
export class AgentsController {
  constructor(private readonly prisma: PrismaService) {}

  private async requireAgent(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new AppException('AGENT_PROFILE_MISSING', 'No agent profile for this user', HttpStatus.NOT_FOUND);
    return agent;
  }

  @Get('orders')
  async myOrders(@CurrentUser() user: AuthUser) {
    const agent = await this.requireAgent(user.userId);
    return this.prisma.order.findMany({
      where: { assignedAgentId: agent.id, currentStatus: { notIn: ['DELIVERED', 'CANCELLED'] } },
      orderBy: { promisedDate: 'asc' },
      include: {
        pickupAddress: { select: { line1: true, city: true, pincode: true, contactName: true, contactPhone: true } },
        dropAddress: { select: { line1: true, city: true, pincode: true, contactName: true, contactPhone: true } },
        pickupZone: { select: { code: true } },
        dropZone: { select: { code: true } },
      },
    });
  }

  @Patch('availability')
  async setAvailability(@Body() dto: UpdateAvailabilityDto, @CurrentUser() user: AuthUser) {
    const agent = await this.requireAgent(user.userId);
    return this.prisma.agent.update({
      where: { id: agent.id },
      data: { availability: dto.availability },
      select: { id: true, agentCode: true, availability: true },
    });
  }

  @Patch('location')
  async setLocation(@Body() dto: UpdateLocationDto, @CurrentUser() user: AuthUser) {
    const agent = await this.requireAgent(user.userId);
    return this.prisma.agent.update({
      where: { id: agent.id },
      data: { currentLat: dto.lat, currentLng: dto.lng, locationUpdatedAt: new Date() },
      select: { id: true, currentLat: true, currentLng: true, locationUpdatedAt: true },
    });
  }
}
