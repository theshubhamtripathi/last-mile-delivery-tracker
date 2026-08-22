import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationDispatcher } from './notification-dispatcher.service';

/**
 * Drains the transactional outbox every 10 seconds (charter §11). Kept separate
 * from the request path so a status change commits fast and delivery happens out
 * of band with retries and backoff. A single in-flight guard prevents
 * overlapping runs.
 */
@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger('NotificationWorker');
  private running = false;

  constructor(private readonly dispatcher: NotificationDispatcher) {}

  @Interval(10_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.dispatcher.drain();
      if (result.processed > 0) {
        this.logger.log(`Drained outbox: ${result.sent} sent, ${result.failed} failed`);
      }
    } catch (err) {
      this.logger.error(`Outbox drain error: ${String(err)}`);
    } finally {
      this.running = false;
    }
  }
}
