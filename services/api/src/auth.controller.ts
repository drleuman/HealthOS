import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

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
  async login(@Body('email') email: string) {
    return this.svc.login(email || 'test@example.com');
  }
}
