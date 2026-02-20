import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private jwt: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        const isProd = process.env.NODE_ENV === 'production';

        // EXCLUSIVE BEARER TOKEN STRATEGY (Option B)
        let token = this.extractTokenFromHeader(request);

        // Fallback to cookie only in dev for same-origin or legacy support
        if (!token && !isProd) {
            token = request.cookies?.['hos_session'] || request.cookies?.['access_token'];
        }

        if (!token) {
            throw new UnauthorizedException('Authentication token missing');
        }

        const secret = process.env.API_JWT_SECRET;
        if (isProd && (!secret || secret.length < 32)) {
            // This should be caught in bootstrap, but guard check adds depth
            throw new Error('Internal security configuration error');
        }

        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: secret || 'dev_secret',
            });
            // Ensure stable claims
            (request as any)['user'] = {
                id: payload.sub,
                email: payload.email,
                plan: payload.plan || 'free'
            };
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
