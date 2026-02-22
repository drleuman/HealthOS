import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MetricsService } from './metrics/metrics.service';

import { SelfHealingService } from './analytics/self-healing.service';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
    constructor(
        options: ThrottlerModuleOptions,
        storageService: ThrottlerStorage,
        reflector: Reflector,
        private metrics: MetricsService,
        private healing: SelfHealingService
    ) {
        super(options, storageService, reflector);
    }
    protected async handleRequest(requestProps: any): Promise<boolean> {
        // If SelfHealing is active, tighten the limit by 50%
        if (this.healing.isThrottlingTightened()) {
            requestProps.limit = Math.floor(requestProps.limit / 2);
        }
        return super.handleRequest(requestProps);
    }

    protected async getTracker(req: Record<string, any>): Promise<string> {
        // Rate limit by IP + userId (if authenticated)
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        const userId = req.user?.sub || req.user?.email || '';

        // Combine IP and userId for more granular rate limiting
        return userId ? `${ip}:${userId}` : ip;
    }

    protected async getErrorMessage(context: ExecutionContext, throttlerLimitDetail: any): Promise<string> {
        this.metrics.recordRateLimit();
        return 'Too many requests. Please try again later.';
    }
}
