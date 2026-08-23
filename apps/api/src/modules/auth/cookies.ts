import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { TokenPair } from './auth.service';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

// Cookie lifetimes mirror the token TTLs (access 15m, refresh 7d).
const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function baseOptions(config: ConfigService) {
  const secure = config.get<string>('COOKIE_SECURE') === 'true';
  // The hosted demo serves the web app and API on different sites (vercel.app vs
  // onrender.com), so the session cookies must be SameSite=None to be sent on
  // cross-site requests — which the browser only allows when Secure. Locally
  // (same-site, http) we use Lax. Secure implies a production/HTTPS deployment.
  return {
    httpOnly: true, // never readable by JS — mitigates XSS token theft
    secure,
    sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: TokenPair,
  config: ConfigService,
): void {
  const base = baseOptions(config);
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: ACCESS_MAX_AGE_MS,
  });
  // Refresh cookie is scoped so it is only sent to the refresh endpoint.
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = baseOptions(config);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
