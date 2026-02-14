import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) { }

  private getPlanForEmail(email: string): string {
    const allowlistEnv = process.env.BETA_ALLOWLIST || "";
    if (!allowlistEnv) return 'member'; // No allowlist, default behavior

    const allowlist = allowlistEnv.split(',').map(e => e.trim().toLowerCase());
    return allowlist.includes(email.toLowerCase()) ? 'member' : 'free';
  }

  async createSsoToken(email: string, tool: string) {
    const plan = this.getPlanForEmail(email);
    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email, plan },
      update: { plan }, // Update plan if it changed in allowlist
    }).catch(() => ({ id: 'mock-uuid', email, plan }));

    const secret = process.env.SSO_JWT_SECRET || process.env.API_JWT_SECRET || 'dev_secret';
    const token = this.jwt.sign(
      { sub: user.id, email: user.email, plan: user.plan, ctx: { tool } },
      { secret, expiresIn: 60 }
    );

    return {
      token,
      redirect_url: `https://mithohacks.com/sso-login?token=${encodeURIComponent(token)}`
    };
  }

  async login(email: string) {
    const plan = this.getPlanForEmail(email);
    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email, plan },
      update: { plan },
    }).catch(() => ({ id: 'mock-uuid', email, plan }));

    const payload = { sub: user.id, email: user.email, plan: user.plan };
    const secret = process.env.API_JWT_SECRET || 'dev_secret';

    return {
      access_token: this.jwt.sign(payload, { secret, expiresIn: '7d' }),
      user
    };
  }

  async verifySsoToken(token: string) {
    const secret = process.env.SSO_JWT_SECRET || process.env.API_JWT_SECRET || 'dev_secret';
    try {
      const decoded = this.jwt.verify(token, { secret });
      return { valid: true, decoded };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }
}
