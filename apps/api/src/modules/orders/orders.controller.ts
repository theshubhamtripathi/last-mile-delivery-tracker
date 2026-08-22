import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssignDto, CreateOrderDto, RescheduleDto, UpdateStatusDto } from '@lmd/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { OrdersService } from './orders.service';
import { LifecycleService } from './lifecycle.service';
import { RescheduleService } from './reschedule.service';
import { AssignmentService } from '../assignment/assignment.service';
import { AutoAssignmentService } from '../assignment/auto-assignment.service';
import { TrackingService } from '../tracking/tracking.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly lifecycle: LifecycleService,
    private readonly rescheduleService: RescheduleService,
    private readonly assignment: AssignmentService,
    private readonly autoAssignment: AutoAssignmentService,
    private readonly tracking: TrackingService,
  ) {}

  @Roles('CUSTOMER', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create an order from a quote (customer or admin on behalf)' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.orders.createFromQuote(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (role-scoped; filter by status/zone/agent/date/q)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('zoneId') zoneId?: string,
    @Query('agentId') agentId?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.orders.list(
      { status, zoneId, agentId, q, from, to, page: page ? +page : undefined, pageSize: pageSize ? +pageSize : undefined },
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail including the frozen pricing snapshot' })
  detail(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.findOne(id, user);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Full append-only tracking timeline' })
  async tracking_(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.orders.findOne(id, user); // access check
    return this.tracking.list(id);
  }

  @Get(':id/tracking/verify')
  @ApiOperation({ summary: 'Verify the per-order hash chain integrity' })
  async verify(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.orders.findOne(id, user);
    return this.tracking.verify(id);
  }

  @Roles('ADMIN')
  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign an agent manually ({agentId}) or automatically ({strategy:"AUTO"})' })
  assign(@Param('id') id: string, @Body() dto: AssignDto, @CurrentUser() user: AuthUser) {
    if (dto.strategy === 'AUTO') {
      return this.autoAssignment.autoAssign(id, user);
    }
    if (!dto.agentId) {
      return this.autoAssignment.autoAssign(id, user); // default to AUTO when no agent given
    }
    return this.assignment.assignManual(id, dto.agentId, user);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Advance status (agent) or override (admin, reason required)' })
  status(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: AuthUser) {
    return this.lifecycle.advance(id, dto, user);
  }

  @Roles('CUSTOMER', 'ADMIN')
  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule a failed delivery; auto-reassigns a new agent' })
  reschedule(@Param('id') id: string, @Body() dto: RescheduleDto, @CurrentUser() user: AuthUser) {
    return this.rescheduleService.reschedule(id, dto, user);
  }
}
