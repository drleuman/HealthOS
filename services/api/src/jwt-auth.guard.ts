import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private jwt: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        // 1. Check for Legacy X-User-Email header
        const legacyEmail = request.headers['x-user-email'];
        if (legacyEmail) {
            (request as any)['user'] = { email: String(legacyEmail), plan: 'member' };
            return true;
        }

        // 2. Check for JWT Authorization header
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException('No token or user info provided');
        }

        try {
            const payload = await this.jwt.verifyAsync(token, {
                secret: process.env.API_JWT_SECRET || 'dev_secret',
            });
            // sub is user.id
            (request as any)['user'] = { id: payload.sub, email: payload.email, plan: payload.plan };
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
