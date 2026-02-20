import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
    ) { }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async generateTokenPair(user: { id: string, email: string, plan: string }, sessionId?: string, ip?: string, userAgent?: string) {
        const secret = process.env.API_JWT_SECRET || 'dev_secret';

        const accessToken = this.jwt.sign(
            { sub: user.id, email: user.email, plan: user.plan },
            {
                secret,
                expiresIn: '15m'
            },
        );

        const refreshTokenValue = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(refreshTokenValue);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        const tokenRecord = await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                sessionId: sessionId || crypto.randomUUID(),
                tokenHash,
                expiresAt,
                ip,
                userAgent,
            },
        });

        return {
            id: tokenRecord.id,
            accessToken,
            refreshToken: refreshTokenValue,
            expiresIn: 900, // 15 minutes
        };
    }

    async rotate(refreshTokenValue: string, ip?: string, userAgent?: string) {
        const tokenHash = this.hashToken(refreshTokenValue);

        const tokenRecord = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });

        if (!tokenRecord) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
            throw new UnauthorizedException('Refresh token expired or revoked');
        }

        // Reuse detection
        if (tokenRecord.rotatedAt) {
            // Revoke all tokens in session (Reuse detected!)
            await this.prisma.refreshToken.updateMany({
                where: { sessionId: tokenRecord.sessionId },
                data: { revokedAt: new Date() },
            });
            throw new UnauthorizedException('Security Breach: Token reuse detected. All sessions for this device revoked.');
        }

        // Create new pair within the same session
        const newPair = await this.generateTokenPair(
            { id: tokenRecord.user.id, email: tokenRecord.user.email, plan: tokenRecord.user.plan },
            tokenRecord.sessionId,
            ip,
            userAgent,
        );

        // Update old token to mark as rotated
        await this.prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: {
                rotatedAt: new Date(),
                replacedById: newPair.id,
            },
        });

        return newPair;
    }

    async revoke(refreshTokenValue: string) {
        const tokenHash = this.hashToken(refreshTokenValue);
        await this.prisma.refreshToken.update({
            where: { tokenHash },
            data: { revokedAt: new Date() },
        }).catch(() => { });
    }

    async revokeAll(userId: string) {
        await this.prisma.refreshToken.updateMany({
            where: { userId },
            data: { revokedAt: new Date() },
        });
    }
}
