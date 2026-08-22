import type { NotificationProvider, OutboundMessage, SendResult } from './provider.interface';

/**
 * Email via the Resend REST API called directly with fetch — no SDK. Selected
 * only when RESEND_API_KEY is present; otherwise the worker uses the console
 * provider.
 */
export class ResendProvider implements NotificationProvider {
  readonly channel = 'EMAIL' as const;
  readonly available: boolean;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly from: string,
  ) {
    this.available = Boolean(apiKey);
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.recipient],
        subject: message.subject,
        html: message.body,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Resend ${res.status}: ${detail}`);
    }
    const json = (await res.json()) as { id?: string };
    return { providerMessageId: json.id ?? 'resend:unknown' };
  }
}
