import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RegisterDto, LoginDto } from '@lmd/shared';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AuthService, type AuthResult } from './auth.service';
import { clearAuthCookies, setAuthCookies } from './cookies';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    return this.respondWithSession(res, result);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in and receive httpOnly session cookies' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    return this.respondWithSession(res, result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange the refresh cookie for a fresh session' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token;
    const result = await this.auth.refresh(token);
    return this.respondWithSession(res, result);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Clear the session cookies' })
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res, this.config);
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  /** Sets the cookies and returns the user (tokens are also in the body for
   *  non-browser clients like Swagger). */
  private respondWithSession(res: Response, result: AuthResult) {
    setAuthCookies(res, result.tokens, this.config);
    return { user: result.user, tokens: result.tokens };
  }
}
