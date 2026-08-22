import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@lmd/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../types';

/**
 * Runs after JwtAuthGuard. Routes without @Roles() are open to any
 * authenticated user; routes with it require the caller's role to match.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this resource');
    }
    return true;
  }
}
