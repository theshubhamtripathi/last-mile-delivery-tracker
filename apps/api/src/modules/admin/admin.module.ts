import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminController } from './admin.controller';

// Global so any module can write audit records without re-importing.
@Global()
@Module({
  controllers: [AdminController],
  providers: [AuditService, AdminDashboardService],
  exports: [AuditService],
})
export class AdminModule {}
