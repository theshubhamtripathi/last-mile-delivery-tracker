import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * The single place an error becomes an HTTP response. Every failure — domain
 * AppException, Nest HttpException (including validation pipe errors), or an
 * unexpected throw — is rendered into one envelope:
 *
 *   { error: { code, message, details }, requestId }
 *
 * so clients parse one shape and can branch on a stable `code`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();
    const requestId: string = req?.requestId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = codeFromStatus(status);
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        // AppException shape: { code, message, details }
        if (typeof b.code === 'string') code = b.code;
        else code = codeFromStatus(status);
        // Nest validation pipe: { message: string[] , error, statusCode }
        if (Array.isArray(b.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Request validation failed';
          details = b.message;
        } else if (typeof b.message === 'string') {
          message = b.message;
        }
        if (b.details !== undefined) details = b.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log the full error server-side; never leak internals to the client body.
      this.logger.error(
        `[${requestId}] ${req?.method} ${req?.url} -> ${status} ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      message = 'An unexpected error occurred';
      details = undefined;
    }

    res.status(status).json({ error: { code, message, details }, requestId });
  }
}

function codeFromStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'UNPROCESSABLE_ENTITY';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return 'ERROR';
  }
}
