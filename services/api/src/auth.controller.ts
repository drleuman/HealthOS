import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) { }

  @Get('sso-token')
  async sso(@Query('tool') tool: string, @Req() req: any) {
    const email = String(req.headers['x-user-email'] || 'test@example.com');
    return this.svc.createSsoToken(email, tool);
  }

  @Get('debug-token')
  async debug(@Query('token') token: string) {
    return this.svc.verifySsoToken(token);
  }

  @Post('login')
  async login(@Body('email') email: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.svc.login(email || 'test@example.com');

    // ZERO-PREFLIGHT: Use HttpOnly Cookie instead of returning token
    res.cookie('hos_session', result.access_token, {
      httpOnly: true,
      secure: true, // Always true for cross-site (Vercel -> Plesk)
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Also set legacy cookie for now just in case, but 'hos_session' is the key
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: result.user }; // No token in body
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('hos_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });
    return { ok: true };
  }
}
