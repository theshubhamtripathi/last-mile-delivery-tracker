import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('admin')
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('dashboard/metrics')
  metrics() {
    return this.dashboard.metrics();
  }

  @Get('agents')
  agents() {
    return this.dashboard.listAgents();
  }

  @Get('notifications')
  notificationLog(@Query('status') status?: string) {
    return this.notifications.list({ status });
  }

  @Get('audit-logs')
  auditLogs(@Query('entityType') entityType?: string) {
    return this.audit.list({ entityType });
  }
}
