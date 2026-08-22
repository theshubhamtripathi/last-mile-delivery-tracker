import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateServiceAreaDto,
  CreateZoneDto,
  UpdateZoneDto,
} from '@lmd/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AdminZonesService } from './admin-zones.service';

@ApiTags('admin/zones')
@Roles('ADMIN')
@Controller('admin')
export class AdminZonesController {
  constructor(private readonly zones: AdminZonesService) {}

  @Get('zones')
  listZones() {
    return this.zones.listZones();
  }

  @Post('zones')
  createZone(@Body() dto: CreateZoneDto, @CurrentUser() user: AuthUser) {
    return this.zones.createZone(dto, user.userId);
  }

  @Patch('zones/:id')
  updateZone(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.zones.updateZone(id, dto, user.userId);
  }

  @Get('areas')
  listAreas(@Query('zoneId') zoneId?: string) {
    return this.zones.listAreas(zoneId);
  }

  @Post('areas')
  createArea(@Body() dto: CreateServiceAreaDto, @CurrentUser() user: AuthUser) {
    return this.zones.createArea(dto, user.userId);
  }
}
