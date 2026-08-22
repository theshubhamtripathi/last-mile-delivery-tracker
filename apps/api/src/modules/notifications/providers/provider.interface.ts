export interface SendResult {
  providerMessageId: string;
}

export interface OutboundMessage {
  recipient: string;
  subject: string;
  /** HTML for email; plain text for SMS. */
  body: string;
  text: string;
}

/**
 * A channel provider. Implementations call a real REST API (Resend, Twilio) via
 * fetch — no SDKs — or the console fallback. `available` lets the worker pick a
 * live provider when credentials exist and degrade to console otherwise, so the
 * app is fully demonstrable with zero API keys.
 */
export interface NotificationProvider {
  readonly channel: 'EMAIL' | 'SMS';
  readonly available: boolean;
  send(message: OutboundMessage): Promise<SendResult>;
}
