import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificationWorker } from './notification.worker';

// Global so orders, lifecycle and assignment can enqueue within their own
// transactions. The dispatcher (providers + retry) and the scheduled worker
// drain the outbox out of band.
@Global()
@Module({
  providers: [NotificationsService, NotificationDispatcher, NotificationWorker],
  exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule {}
