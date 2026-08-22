import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateRateCardDto,
  CreateSurchargeRuleDto,
  SimulateDto,
  UpdatePricingConfigDto,
} from '@lmd/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AdminRatingService } from './admin-rating.service';

@ApiTags('admin/rating')
@Roles('ADMIN')
@Controller('admin')
export class AdminRatingController {
  constructor(private readonly admin: AdminRatingService) {}

  @Get('rate-cards')
  listRateCards() {
    return this.admin.listRateCards();
  }

  @Post('rate-cards')
  createRateCard(@Body() dto: CreateRateCardDto, @CurrentUser() user: AuthUser) {
    return this.admin.createRateCard(dto, user.userId);
  }

  @Patch('rate-cards/:id/close')
  closeRateCard(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.admin.closeRateCard(id, user.userId);
  }

  @Post('rate-cards/simulate')
  simulate(@Body() dto: SimulateDto) {
    return this.admin.simulate(dto);
  }

  @Get('surcharges')
  listSurcharges() {
    return this.admin.listSurcharges();
  }

  @Post('surcharges')
  createSurcharge(@Body() dto: CreateSurchargeRuleDto, @CurrentUser() user: AuthUser) {
    return this.admin.createSurcharge(dto, user.userId);
  }

  @Get('pricing-config')
  getPricingConfig() {
    return this.admin.getActivePricingConfig();
  }

  @Patch('pricing-config')
  updatePricingConfig(@Body() dto: UpdatePricingConfigDto, @CurrentUser() user: AuthUser) {
    return this.admin.updatePricingConfig(dto, user.userId);
  }
}
