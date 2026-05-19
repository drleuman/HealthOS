import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { MetricsService } from './metrics/metrics.service';
import { TrackingService } from './tracking.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private refreshService: RefreshTokenService,
    private metrics: MetricsService,
    private tracking: TrackingService
  ) { }

  private isEmailAllowlisted(email: string): boolean {
    const lowerEmail = email.toLowerCase();
    
    // Admins are always allowed
    const adminEmailsEnv = process.env.ADMIN_EMAILS || 'doctorleuman@gmail.com';
    const adminEmails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase());
    if (adminEmails.includes(lowerEmail)) {
      return true;
    }

    const allowlistRequired = process.env.BETA_ALLOWLIST_REQUIRED === 'true';
    if (!allowlistRequired) {
      return true;
    }

    const allowlistEnv = process.env.BETA_ALLOWLIST || "";
    if (!allowlistEnv) {
      return false;
    }

    const allowlist = allowlistEnv.split(',').map(e => e.trim().toLowerCase());
    return allowlist.includes(lowerEmail);
  }

  private getPlanForEmail(email: string): string {
    const lowerEmail = email.toLowerCase();

    const adminEmailsEnv = process.env.ADMIN_EMAILS || 'doctorleuman@gmail.com';
    const adminEmails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase());
    if (adminEmails.includes(lowerEmail)) return 'admin';

    const allowlistEnv = process.env.BETA_ALLOWLIST || "";
    if (!allowlistEnv) return 'member';

    const allowlist = allowlistEnv.split(',').map(e => e.trim().toLowerCase());
    return allowlist.includes(lowerEmail) ? 'member' : 'free';
  }

  async createSsoToken(email: string, tool: string) {
    const lowerEmail = email.trim().toLowerCase();
    if (!this.isEmailAllowlisted(lowerEmail)) {
      throw new UnauthorizedException('Email not on the beta allowlist');
    }

    const plan = this.getPlanForEmail(lowerEmail);
    const role = plan === 'admin' ? 'admin' : 'user';
    const user = await this.prisma.user.upsert({
      where: { email: lowerEmail },
      create: { email: lowerEmail, plan, role },
      update: { plan, role }, // Update plan/role if it changed
    });

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

  async login(email: string, ip?: string, ua?: string) {
    const lowerEmail = email.trim().toLowerCase();
    if (!this.isEmailAllowlisted(lowerEmail)) {
      this.metrics.recordLogin(false);
      throw new UnauthorizedException('Email not on the beta allowlist');
    }

    const plan = this.getPlanForEmail(lowerEmail);
    const role = plan === 'admin' ? 'admin' : 'user';
    const user = await this.prisma.user.upsert({
      where: { email: lowerEmail },
      create: { email: lowerEmail, plan, role },
      update: { plan, role },
    }).catch((e) => {
      this.metrics.recordLogin(false);
      throw e;
    });

    this.metrics.recordLogin(true);

    const tokens = await this.refreshService.generateTokenPair(
      { id: user.id, email: user.email, plan: user.plan },
      undefined,
      ip,
      ua
    );

    // Telemetry: Track login success
    this.tracking.track({
      userId: user.id,
      event: 'login_success',
      context: {
        role: user.role,
        plan: user.plan
      }
    }).catch((err) => {
      console.error('Failed to track login success:', err);
    });

    return {
      ...tokens,
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
