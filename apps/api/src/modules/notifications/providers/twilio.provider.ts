import type { NotificationProvider, OutboundMessage, SendResult } from './provider.interface';

/**
 * SMS via the Twilio REST API with a Basic auth header and fetch — no SDK.
 * Selected only when Twilio credentials are present; otherwise console.
 */
export class TwilioProvider implements NotificationProvider {
  readonly channel = 'SMS' as const;
  readonly available: boolean;

  constructor(
    private readonly accountSid: string | undefined,
    private readonly authToken: string | undefined,
    private readonly fromNumber: string | undefined,
  ) {
    this.available = Boolean(accountSid && authToken && fromNumber);
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const form = new URLSearchParams({
      To: message.recipient,
      From: this.fromNumber as string,
      Body: message.text,
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Twilio ${res.status}: ${detail}`);
    }
    const json = (await res.json()) as { sid?: string };
    return { providerMessageId: json.sid ?? 'twilio:unknown' };
  }
}
