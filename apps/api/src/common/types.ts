import type { Role } from '@lmd/shared';

/** Shape written to req.user by the JWT guard and read by @CurrentUser(). */
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}

/** Access/refresh token payload. `sub` is the user id (JWT convention). */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  /** Discriminates access vs refresh tokens so one cannot be used as the other. */
  typ: 'access' | 'refresh';
}
