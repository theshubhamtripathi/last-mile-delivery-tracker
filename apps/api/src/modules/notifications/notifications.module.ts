import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// Global so orders, lifecycle and assignment can enqueue within their own
// transactions. The worker and providers are registered here in Phase 4.
@Global()
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
