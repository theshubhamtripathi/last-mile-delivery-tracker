import { SetMetadata } from '@nestjs/common';
import type { Role } from '@lmd/shared';

export const ROLES_KEY = 'roles';

/** Restrict a route to one or more roles; enforced by RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
