import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { RefreshTokenService } from './refresh-token.service';

@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class AuthController {
  constructor(
    private readonly svc: AuthService,
    private readonly refreshService: RefreshTokenService
  ) { }

  @Get('sso-token')
  @UseGuards(JwtAuthGuard)
  async sso(@Query('tool') tool: string, @Req() req: any) {
    // SECURITY: Use identifying info from JWT, not untrusted headers
    const email = req.user.email;
    return this.svc.createSsoToken(email, tool);
  }

  @Get('debug-token')
  async debug(@Query('token') token: string) {
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    const isDebugEnabled = String(process.env.DEBUG_AUTH || '').toLowerCase() === 'true';

    if (!isDev && !isDebugEnabled) {
      return { ok: false, message: 'Debug endpoint disabled in production' };
    }
    return this.svc.verifySsoToken(token);
  }

  @Post('login')
  async login(@Body('email') email: string, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    // Remove insecure fallback to test@example.com in production
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Email is required');
    }

    const result = await this.svc.login(
      normalizedEmail || 'test@example.com',
      req.ip,
      req.headers['user-agent']
    );

    // Cookie fallback for dev/legacy
    res.cookie('hos_session', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      user: result.user,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: result.expiresIn
    };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(@Body('refresh_token') token: string, @Req() req: any) {
    if (!token) throw new BadRequestException('Refresh token is required');
    return this.refreshService.rotate(token, req.ip, req.headers['user-agent']);
  }

  @Post('logout')
  async logout(@Body('refresh_token') token: string, @Res({ passthrough: true }) res: Response) {
    if (token) {
      await this.refreshService.revoke(token);
    }

    res.clearCookie('hos_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });
    return { ok: true };
  }
}
