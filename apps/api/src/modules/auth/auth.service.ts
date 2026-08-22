import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto, type Role } from '@lmd/shared';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload, AuthUser } from '../../common/types';

const BCRYPT_ROUNDS = 10;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: AuthUser & { fullName: string };
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    // Self-registration only ever creates a CUSTOMER (see RegisterDto).
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: 'CUSTOMER',
        customerProfile: {
          create: {
            companyName: dto.companyName,
            defaultOrderType: dto.defaultOrderType ?? 'B2C',
          },
        },
      },
    });

    return this.buildResult(user.id, user.email, user.role, user.fullName);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    // Constant-ish message: never reveal whether the email exists.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildResult(user.id, user.email, user.role, user.fullName);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Wrong token type');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is no longer active');
    }
    return this.buildResult(user.id, user.email, user.role, user.fullName);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });
    if (!user) throw new UnauthorizedException('Account not found');
    return user;
  }

  private async buildResult(
    id: string,
    email: string,
    role: Role,
    fullName: string,
  ): Promise<AuthResult> {
    const tokens = await this.issueTokens(id, email, role);
    return { user: { userId: id, email, role, fullName }, tokens };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<TokenPair> {
    const base = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, typ: 'access' } satisfies JwtPayload,
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
        },
      ),
      this.jwt.signAsync(
        { ...base, typ: 'refresh' } satisfies JwtPayload,
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }
}
