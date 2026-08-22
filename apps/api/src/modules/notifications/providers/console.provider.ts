import { Logger } from '@nestjs/common';
import type { NotificationProvider, OutboundMessage, SendResult } from './provider.interface';

/**
 * The zero-config fallback. Logs the message and returns a `console:` id so the
 * outbox marks it SENT. A cold `git clone` with no API keys still demonstrates
 * the entire notification flow (charter §11).
 */
export class ConsoleProvider implements NotificationProvider {
  readonly available = true;
  private readonly logger = new Logger('ConsoleNotifier');

  constructor(readonly channel: 'EMAIL' | 'SMS') {}

  async send(message: OutboundMessage): Promise<SendResult> {
    this.logger.log(
      `[${this.channel}] to ${message.recipient} :: ${message.subject} :: ${message.text}`,
    );
    return { providerMessageId: `console:${Date.now()}` };
  }
}
