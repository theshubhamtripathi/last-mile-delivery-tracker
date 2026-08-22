import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthUser, JwtPayload } from '../types';

/**
 * Applied globally. Verifies the access token from the httpOnly cookie (browser
 * clients) or a Bearer header (API/Swagger clients), then puts an AuthUser on
 * the request. Routes marked @Public() bypass it. This is a ~30-line JWT check;
 * per the charter no Passport strategy is pulled in for it.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Authentication required');

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.typ !== 'access') {
        throw new UnauthorizedException('Wrong token type');
      }
      const user: AuthUser = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(req: {
    cookies?: Record<string, string>;
    headers: Record<string, string | undefined>;
  }): string | undefined {
    const fromCookie = req.cookies?.access_token;
    if (fromCookie) return fromCookie;
    const auth = req.headers['authorization'];
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return undefined;
  }
}
