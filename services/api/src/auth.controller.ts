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

    // Set secure cookie for production cross-domain support
    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }
}
