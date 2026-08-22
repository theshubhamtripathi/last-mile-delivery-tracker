import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Runs before guards, pipes and handlers so every request — including ones
 * rejected by a guard (401/403) — carries a request id that the exception
 * filter can echo into the error envelope and correlate with server logs.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
