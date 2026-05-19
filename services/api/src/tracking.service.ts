import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MetricsService } from './metrics/metrics.service';
import { AnalyticsIntegrationService } from './analytics/analytics-integration.service';
import { logger } from './logger';

/**
 * Standard event schema for HealthOS
 * All events must follow this structure
 */
export interface TrackingEvent {
    event: string;
    userId?: string;
    sessionId?: string;
    timestamp?: Date;
    context?: {
        program?: string;
        day?: number;
        streak?: number;
        profile?: string;
        [key: string]: any;
    };
    meta?: {
        platform?: 'web' | 'mobile' | 'api';
        version?: string;
        [key: string]: any;
    };
}

/**
 * Official HealthOS Event Taxonomy
 * 
 * A — Inicio del proceso
 * - onboarding_started
 * - onboarding_completed
 * - profile_generated
 * 
 * B — Ejecución diaria (núcleo del producto)
 * - day_viewed
 * - day_started
 * - action_marked_done
 * - action_marked_failed
 * - day_completed
 * - streak_extended
 * - streak_broken
 * 
 * C — Fricción (oro puro)
 * - lesson_replayed
 * - help_opened
 * - skipped_day
 * - auto_simplified
 * - return_after_drop
 * 
 * D — Herramientas (Mithohacks)
 * - tool_recommended
 * - tool_opened_store
 * - tool_purchased
 * - tool_guide_opened
 * 
 * E — Retención
 * - week_completed
 * - program_completed
 * - second_program_started
 * 
 * F — Conversión & Negocio
 * - paywall_impression (viewed gated content)
 * - paywall_cta_clicked (intent to upgrade)
 * - access_blocked_limit (hard limit hit)
 * - quota_consumed (rolling quota tick)
 * - conversion_started
 * - conversion_completed
 */
@Injectable()
export class TrackingService {
    constructor(
        private prisma: PrismaService,
        private metrics: MetricsService,
        private analytics: AnalyticsIntegrationService
    ) { }

    private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
        if (!context) return undefined;
        
        const sensitiveKeys = [
            'comment', 'feedback', 'text', 'message', 'note', 'input', 'answers', 
            'symptoms', 'caffeine_time', 'bedtime', 'dinner_time', 'sleep_issue_type', 
            'primary_goal', 'self_report_effect', 'medical', 'clinical', 'description'
        ];

        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(context)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
                continue;
            }
            if (typeof value === 'string' && value.length > 100) {
                continue;
            }
            sanitized[key] = value;
        }
        return sanitized;
    }

    /**
     * Track a behavioral event
     * Non-blocking: queues event for async processing
     */
    async track(event: TrackingEvent): Promise<void> {
        try {
            // Validate event name
            if (!event.event || typeof event.event !== 'string') {
                logger.warn({ event }, 'Invalid event: missing or invalid event name');
                return;
            }

            const sanitizedContext = this.sanitizeContext(event.context) || {};
            const sanitizedMeta = this.sanitizeContext(event.meta) || {};

            // Store event in database
            await this.prisma.event.create({
                data: {
                    event: event.event,
                    userId: event.userId,
                    sessionId: event.sessionId,
                    timestamp: event.timestamp || new Date(),
                    context: sanitizedContext,
                    meta: sanitizedMeta,
                },
            });

            // Increment totalLogs for behavioral events (Categories B, C, D)
            const behavioralEvents = [
                'day_viewed', 'day_started', 'action_marked_done', 'action_marked_failed',
                'day_completed', 'lesson_replayed', 'help_opened', 'skipped_day',
                'auto_simplified', 'return_after_drop', 'tool_opened_store'
            ];

            if (event.userId && behavioralEvents.includes(event.event)) {
                await this.prisma.user.update({
                    where: { id: event.userId },
                    data: { totalLogs: { increment: 1 } }
                }).catch(err => logger.error({ err, userId: event.userId }, 'Failed to increment totalLogs'));
            }

            // Integrate with MetricsService
            if (event.event === 'paywall_impression' || event.event === 'paywall_cta_clicked') {
                this.metrics.recordPaywallHit();
            } else if (event.event === 'conversion_completed') {
                this.metrics.recordConversion();
            }

            // Mirror to PostHog
            if (event.userId) {
                this.analytics.track(event.userId, event.event, {
                    ...sanitizedContext,
                    ...sanitizedMeta,
                    $session_id: event.sessionId
                }).catch(err => logger.error({ err }, 'PostHog mirroring failed'));
            }

            logger.info(
                {
                    event: event.event,
                    userId: event.userId,
                    sessionId: event.sessionId,
                },
                'Event tracked',
            );
        } catch (error) {
            // Never throw - tracking should not break app flow
            logger.error({ error, event }, 'Failed to track event');
        }
    }

    /**
     * Track multiple events in batch
     */
    async trackBatch(events: TrackingEvent[]): Promise<void> {
        try {
            await this.prisma.event.createMany({
                data: events.map((event) => {
                    const sanitizedContext = this.sanitizeContext(event.context) || {};
                    const sanitizedMeta = this.sanitizeContext(event.meta) || {};
                    return {
                        event: event.event,
                        userId: event.userId,
                        sessionId: event.sessionId,
                        timestamp: event.timestamp || new Date(),
                        context: sanitizedContext,
                        meta: sanitizedMeta,
                    };
                }),
                skipDuplicates: true,
            });

            logger.info({ count: events.length }, 'Batch events tracked');
        } catch (error) {
            logger.error({ error, count: events.length }, 'Failed to track batch events');
        }
    }

    /**
     * Get events for a user
     */
    async getUserEvents(userId: string, limit = 100) {
        return this.prisma.event.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }

    /**
     * Get events by type
     */
    async getEventsByType(eventType: string, limit = 100) {
        return this.prisma.event.findMany({
            where: { event: eventType },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }

    /**
     * Analytics: Get activation rate (users who completed day 2)
     */
    async getActivationRate(): Promise<{ total: number; activated: number; rate: number }> {
        const totalUsers = await this.prisma.user.count();

        const activatedUsers = await this.prisma.event.groupBy({
            by: ['userId'],
            where: {
                event: 'day_completed',
                context: {
                    path: '$.day',
                    equals: 2,
                },
            },
        });

        const activated = activatedUsers.length;
        const rate = totalUsers > 0 ? (activated / totalUsers) * 100 : 0;

        return { total: totalUsers, activated, rate };
    }

    /**
     * Analytics: Get drop-off at specific day
     */
    async getDropOffAtDay(day: number): Promise<{ usersAtPrevDay: number; usersAtDay: number; dropOff: number }> {
        const usersAtPrevDay = await this.prisma.event.groupBy({
            by: ['userId'],
            where: {
                event: 'day_completed',
                context: {
                    path: '$.day',
                    equals: day - 1,
                },
            },
        });

        const usersAtDay = await this.prisma.event.groupBy({
            by: ['userId'],
            where: {
                event: 'day_completed',
                context: {
                    path: '$.day',
                    equals: day,
                },
            },
        });

        const dropOff = usersAtPrevDay.length - usersAtDay.length;

        return {
            usersAtPrevDay: usersAtPrevDay.length,
            usersAtDay: usersAtDay.length,
            dropOff,
        };
    }

    /**
     * Analytics: Get tool conversion rate
     */
    async getToolConversionRate(): Promise<{ opened: number; purchased: number; rate: number }> {
        const opened = await this.prisma.event.count({
            where: { event: 'tool_opened_store' },
        });

        const purchased = await this.prisma.event.count({
            where: { event: 'tool_purchased' },
        });

        const rate = opened > 0 ? (purchased / opened) * 100 : 0;

        return { opened, purchased, rate };
    }

    /**
     * Track when a user hits a plan limit or sees gated content
     */
    async trackPlanGated(userId: string, plan: string, feature: string, isHardBlock: boolean, context?: any) {
        return this.track({
            event: isHardBlock ? 'access_blocked_limit' : 'paywall_impression',
            userId,
            context: {
                plan,
                feature,
                ...context
            }
        });
    }

    /**
     * Track rolling quota consumption
     */
    async trackQuotaConsumed(userId: string, feature: string, remaining: number) {
        return this.track({
            event: 'quota_consumed',
            userId,
            context: {
                feature,
                remaining
            }
        });
    }
}
