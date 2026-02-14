import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
    protected async getTracker(req: Record<string, any>): Promise<string> {
        // Rate limit by IP + userId (if authenticated)
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const userId = req.user?.sub || req.user?.email || '';

        // Combine IP and userId for more granular rate limiting
        return userId ? `${ip}:${userId}` : ip;
    }

    protected async getErrorMessage(context: ExecutionContext, throttlerLimitDetail: any): Promise<string> {
        return 'Too many requests. Please try again later.';
    }
}
