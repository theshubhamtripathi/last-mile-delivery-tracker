import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain errors carry a stable machine-readable `code` (e.g. QUOTE_STALE,
 * RATE_CARD_NOT_FOUND, INVALID_TRANSITION) alongside the HTTP status. The
 * global filter renders these into the one error envelope used everywhere.
 * Throw this, never a bare string, so clients can branch on `code`.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
