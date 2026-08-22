export type PricingErrorCode =
  | 'INVALID_DIMENSIONS'
  | 'INVALID_WEIGHT'
  | 'RATE_CARD_NOT_FOUND'
  | 'NO_SLAB_FOR_WEIGHT'
  | 'CONFIG_INVALID';

/**
 * The engine never silently falls back to zero. Any condition it cannot price
 * throws with a stable code the API maps to a 4xx and the UI can explain.
 */
export class PricingError extends Error {
  constructor(
    public readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PricingError';
  }
}
