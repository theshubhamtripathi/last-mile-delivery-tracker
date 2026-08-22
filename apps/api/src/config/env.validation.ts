import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Fail fast on boot if the environment is misconfigured. A missing JWT secret
 * or DATABASE_URL should stop the process at startup, not surface as a 500 on
 * the first request. Notification credentials are intentionally optional: with
 * them absent the app falls back to the console notifier and stays fully
 * demonstrable (charter §11).
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV = 'development';

  @IsOptional()
  @IsNumberString()
  API_PORT = '4000';

  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DIRECT_URL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN = 'http://localhost:3000';

  @IsString()
  @MinLength(16)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(16)
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL = '7d';

  @IsOptional()
  @IsBooleanString()
  COOKIE_SECURE = 'false';

  // --- Notifications (all optional; blank selects the console provider) ---
  @IsOptional() @IsString() RESEND_API_KEY?: string;
  @IsOptional() @IsString() NOTIFY_EMAIL_FROM?: string;
  @IsOptional() @IsString() TWILIO_ACCOUNT_SID?: string;
  @IsOptional() @IsString() TWILIO_AUTH_TOKEN?: string;
  @IsOptional() @IsString() TWILIO_FROM_NUMBER?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return validated;
}
