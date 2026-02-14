import { Controller, Post, Body, Get, Query, Headers, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { TrackingService, TrackingEvent } from './tracking.service';
import { Public } from './public.decorator';
import { logger } from './logger';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';

@Controller('events')
export class TrackingController {
    constructor(
        private trackingService: TrackingService,
        private jwtService: JwtService
    ) { }

    /**
     * POST /events
     * Track a single behavioral event
     * Authenticated users are automatically identified.
     * Anonymous users are allowed but rate limited.
     */
    @Public()
    @Throttle({ default: { limit: 20, ttl: 60000 } }) // Stricter limit: 20 req/min
    @Post()
    async trackEvent(
        @Body() event: TrackingEvent,
        @Headers('authorization') authHeader?: string
    ) {
        // Zod Validation
        try {
            const EventSchema = z.object({
                event: z.string().min(1).max(50),
                userId: z.string().optional(),
                sessionId: z.string().optional(),
                timestamp: z.any().optional(), // Allow date or string
                context: z.record(z.any()).optional().refine((val: any) => !val || JSON.stringify(val).length < 5000, "Context too large (>5KB)"),
                meta: z.record(z.any()).optional().refine((val: any) => !val || JSON.stringify(val).length < 2000, "Meta too large (>2KB)"),
            });
            EventSchema.parse(event);
        } catch (e: any) {
            // Drop invalid events silently (or warn) to protect DB
            logger.warn({ error: e.message, event: event.event }, 'Invalid event dropped');
            return { ok: false, error: 'Invalid payload' };
        }

        // 1. Attempt to identify user from token (Soft Auth)
        let userId: string | undefined;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = await this.jwtService.verifyAsync(token, {
                    secret: process.env.API_JWT_SECRET
                });
                userId = payload.sub;
            } catch (e) {
                // Invalid token? Treat as anonymous, don't block tracking
                // But maybe log warn if debugging
            }
        }

        // 2. Attach validated userId
        if (userId) {
            event.userId = userId;
        }

        // 3. Fire and forget
        this.trackingService.track(event).catch((error) => {
            logger.error({ error, event }, 'Event tracking failed');
        });

        return { ok: true };
    }

    /**
     * POST /events/batch
     * Track multiple events at once
     */
    @Public()
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // Very strict for batch
    @Post('batch')
    async trackBatch(
        @Body() body: { events: TrackingEvent[] },
        @Headers('authorization') authHeader?: string
    ) {
        // Similar soft auth logic could be applied here if needed
        // For now, let's keep it simple or strictly strictly anonymous

        this.trackingService.trackBatch(body.events).catch((error) => {
            logger.error({ error, count: body.events.length }, 'Batch tracking failed');
        });

        return { ok: true, count: body.events.length };
    }

    /**
     * Helper to protect analytics endpoints
     */
    private async validateAnalyticsAccess(authHeader?: string, secretHeader?: string) {
        // 1. Check Secret Header (Service-to-Service or Admin Script)
        // Hardcoded secret for now (env var in production)
        const ADMIN_SECRET = process.env.ANALYTICS_SECRET || 'admin-secret-dev';
        if (secretHeader === ADMIN_SECRET) {
            return true;
        }

        // 2. Check Admin JWT
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = await this.jwtService.verifyAsync(token, {
                    secret: process.env.API_JWT_SECRET
                });
                // Check for admin role/claim if it exists. 
                // For now, we only assume specific users or ALL authenticated users?
                // Request says: "admin plan OR X-Analytics-Secret"
                // Our JWT payload has 'plan'.
                if (payload.plan === 'admin' || payload.roles?.includes('admin')) {
                    return true;
                }
            } catch (e) {
                // Invalid token
            }
        }

        throw new HttpException('Forbidden: Admin access required', HttpStatus.FORBIDDEN);
    }

    /**
     * GET /events/analytics/activation
     */
    @Public()
    @Get('analytics/activation')
    async getActivation(
        @Headers('authorization') auth?: string,
        @Headers('x-analytics-secret') secret?: string
    ) {
        await this.validateAnalyticsAccess(auth, secret);
        return this.trackingService.getActivationRate();
    }

    /**
     * GET /events/analytics/dropoff
     */
    @Public()
    @Get('analytics/dropoff')
    async getDropOff(
        @Query('day') day: string,
        @Headers('authorization') auth?: string,
        @Headers('x-analytics-secret') secret?: string
    ) {
        await this.validateAnalyticsAccess(auth, secret);
        const dayNum = parseInt(day, 10) || 3;
        return this.trackingService.getDropOffAtDay(dayNum);
    }

    /**
     * GET /events/analytics/conversion
     */
    @Public()
    @Get('analytics/conversion')
    async getConversion(
        @Headers('authorization') auth?: string,
        @Headers('x-analytics-secret') secret?: string
    ) {
        await this.validateAnalyticsAccess(auth, secret);
        return this.trackingService.getToolConversionRate();
    }
}
