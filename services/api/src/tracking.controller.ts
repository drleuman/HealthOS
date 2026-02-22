import { Controller, Post, Body, Get, Query, Headers, UnauthorizedException, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { TrackingService, TrackingEvent } from './tracking.service';
import { ExperimentService } from './analytics/experiment.service';
import { Public, RequiredPlan } from './public.decorator';
import { logger } from './logger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { EventSignatureGuard } from './tracking/guards/event-signature.guard';

@Controller('events')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class TrackingController {
    constructor(
        private trackingService: TrackingService,
        private experimentService: ExperimentService
    ) { }

    /**
     * POST /events
     * Track a single behavioral event
     * Authenticated users are automatically identified.
     * Anonymous users are allowed but rate limited.
     */
    @Public()
    @Throttle({ default: { limit: 20, ttl: 60000 } }) // Stricter limit: 20 req/min
    @UseGuards(EventSignatureGuard)
    @Post()
    async trackEvent(
        @Body() event: TrackingEvent,
        @Req() req: any
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

        // 1. Identify user from token if available (from Guard)
        if (req.user?.id) {
            event.userId = req.user.id;
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
        @Body() body: { events: TrackingEvent[] }
    ) {
        this.trackingService.trackBatch(body.events).catch((error) => {
            logger.error({ error, count: body.events.length }, 'Batch tracking failed');
        });

        return { ok: true, count: body.events.length };
    }

    /**
     * Helper to protect analytics endpoints (Legacy support for secret header)
     */
    private async validateAnalyticsAccess(authHeader?: string, secretHeader?: string) {
        const ADMIN_SECRET = process.env.ANALYTICS_SECRET || 'admin-secret-dev';
        if (secretHeader === ADMIN_SECRET) {
            return true;
        }
        // Admin plan is now handled by SubscriptionGuard + @RequiredPlan('admin')
        return false;
    }

    /**
     * GET /events/analytics/activation
     */
    @RequiredPlan('admin')
    @Get('analytics/activation')
    async getActivation(
        @Headers('x-analytics-secret') secret?: string
    ) {
        if (secret) await this.validateAnalyticsAccess(undefined, secret);
        return this.trackingService.getActivationRate();
    }

    /**
     * GET /events/analytics/dropoff
     */
    @RequiredPlan('admin')
    @Get('analytics/dropoff')
    async getDropOff(
        @Query('day') day: string,
        @Headers('x-analytics-secret') secret?: string
    ) {
        if (secret) await this.validateAnalyticsAccess(undefined, secret);
        const dayNum = parseInt(day, 10) || 3;
        return this.trackingService.getDropOffAtDay(dayNum);
    }

    /**
     * GET /events/analytics/conversion
     */
    @RequiredPlan('admin')
    @Get('analytics/conversion')
    async getConversion(
        @Headers('x-analytics-secret') secret?: string
    ) {
        if (secret) await this.validateAnalyticsAccess(undefined, secret);
        return this.trackingService.getToolConversionRate();
    }

    /**
     * GET /events/experiments/assignment
     * Fetch deterministic assignment for a user
     */
    @Get('experiments/assignment')
    async getExperimentAssignment(
        @Query('name') name: string,
        @Req() req: any
    ) {
        if (!name) throw new HttpException('Experiment name required', HttpStatus.BAD_REQUEST);
        if (!req.user?.id) throw new UnauthorizedException();

        const variant = await this.experimentService.getVariant(req.user.id, name);
        return { variant };
    }
}
