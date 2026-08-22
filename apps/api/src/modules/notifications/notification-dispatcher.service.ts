import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { renderTemplate, type TemplatePayload } from './templates/templates';
import { ConsoleProvider } from './providers/console.provider';
import { ResendProvider } from './providers/resend.provider';
import { TwilioProvider } from './providers/twilio.provider';
import type { NotificationProvider } from './providers/provider.interface';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger('NotificationDispatcher');
  private readonly email: NotificationProvider;
  private readonly sms: NotificationProvider;
  private readonly trackingBase: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    // Pick a live provider when credentials exist; else the console fallback.
    const resend = new ResendProvider(
      config.get<string>('RESEND_API_KEY'),
      config.get<string>('NOTIFY_EMAIL_FROM') ?? 'Last-Mile Delivery <delivery@example.com>',
    );
    const twilio = new TwilioProvider(
      config.get<string>('TWILIO_ACCOUNT_SID'),
      config.get<string>('TWILIO_AUTH_TOKEN'),
      config.get<string>('TWILIO_FROM_NUMBER'),
    );
    this.email = resend.available ? resend : new ConsoleProvider('EMAIL');
    this.sms = twilio.available ? twilio : new ConsoleProvider('SMS');
    this.trackingBase = (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
      .split(',')[0]
      .trim();
  }

  /** Drain a batch of due QUEUED rows. Called by the scheduled worker. */
  async drain(): Promise<{ processed: number; sent: number; failed: number }> {
    const rows = await this.prisma.notificationOutbox.findMany({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    let sent = 0;
    let failed = 0;
    let processed = 0;
    const now = Date.now();

    for (const row of rows) {
      // Exponential backoff between retries: 0s, 10s, 20s, 40s, ...
      const dueAt = row.updatedAt.getTime() + backoffMs(row.attempts);
      if (row.attempts > 0 && now < dueAt) continue;
      processed++;

      const provider = row.channel === 'EMAIL' ? this.email : this.sms;
      const payload = row.payload as unknown as TemplatePayload;
      const trackingUrl = `${this.trackingBase}/track/${payload.orderNumber}`;
      const rendered = renderTemplate(payload, trackingUrl);

      try {
        const result = await provider.send({
          recipient: row.recipient,
          subject: rendered.subject,
          body: rendered.html,
          text: rendered.text,
        });
        await this.prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: 'SENT',
            attempts: row.attempts + 1,
            providerMessageId: result.providerMessageId,
            sentAt: new Date(),
            lastError: null,
          },
        });
        sent++;
      } catch (err) {
        const attempts = row.attempts + 1;
        const terminal = attempts >= MAX_ATTEMPTS;
        await this.prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: terminal ? 'FAILED' : 'QUEUED',
            attempts,
            lastError: err instanceof Error ? err.message.slice(0, 500) : 'unknown error',
          },
        });
        failed++;
        this.logger.warn(`Notification ${row.id} attempt ${attempts} failed: ${String(err)}`);
      }
    }

    return { processed, sent, failed };
  }
}

function backoffMs(attempts: number): number {
  return Math.min(2 ** attempts * 5000, 5 * 60 * 1000);
}
