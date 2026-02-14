import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TrackingService } from '../tracking.service';
import { logger } from '../logger';

export interface EmailProvider {
    sendEmail(to: string, subject: string, body: string): Promise<{ id?: string }>;
}

export class ConsoleEmailProvider implements EmailProvider {
    async sendEmail(to: string, subject: string, body: string) {
        logger.info({ to, subject, body }, 'EMAIL DISPATCHED (DEV)');
        return { id: `dev-${Date.now()}` };
    }
}

interface EligibilityResult {
    eligible: boolean;
    reason: string;
    skipReason?: string;
}

@Injectable()
export class NotificationHubService implements OnModuleInit {
    private emailProvider: EmailProvider;

    constructor(
        private prisma: PrismaService,
        private trackingService: TrackingService
    ) {
        // Initialize provider based on env or default to console
        this.emailProvider = new ConsoleEmailProvider();
    }

    onModuleInit() {
        if (process.env.EMAIL_PROVIDER === 'resend' && process.env.RESEND_API_KEY) {
            // Placeholder for real provider
            // this.emailProvider = new ResendProvider(process.env.RESEND_API_KEY);
        }
    }

    /**
     * computeEligibility
     * Determines if a user should receive a notification at this moment.
     * Enforces strict causal rules to avoid contamination.
     */
    async computeEligibility(userId: string): Promise<EligibilityResult> {
        // 1. Check Beta Freeze
        if (process.env.BETA_FREEZE === 'true') {
            return { eligible: false, reason: 'beta_frozen', skipReason: 'BETA_FREEZE is active' };
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { state: true }
        });

        if (!user) return { eligible: false, reason: 'user_not_found' };

        // 2. Control Group Holdout (CRITICAL)
        if (user.state?.experimentGroup === 'control') {
            return { eligible: false, reason: 'control_group', skipReason: 'User is in control group' };
        }

        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // 3. Operator Contamination Check
        const operatorInteraction = await this.prisma.operatorInteraction.findFirst({
            where: {
                userId: userId,
                createdAt: { gte: twentyFourHoursAgo }
            }
        });

        if (operatorInteraction) {
            return { eligible: false, reason: 'operator_contamination', skipReason: 'Operator contacted user in last 24h' };
        }

        // 4. Stimulus Contamination Check (Micro-interventions)
        const recentIntervention = await this.prisma.event.findFirst({
            where: {
                userId: userId,
                event: 'intervention_recommended',
                timestamp: { gte: twelveHoursAgo }
            }
        });

        if (recentIntervention) {
            return { eligible: false, reason: 'stimulus_contamination', skipReason: 'Micro-intervention shown in last 12h' };
        }

        // 5. Rate Limit (Max 1 notification / 48h)
        const recentNotification = await (this.prisma as any).notificationEvent.findFirst({
            where: {
                userId: userId,
                sentAt: { gte: fortyEightHoursAgo },
                status: 'sent'
            }
        });

        if (recentNotification) {
            return { eligible: false, reason: 'rate_limited', skipReason: 'Notification sent in last 48h' };
        }

        // 6. State Validation (Inactive > 48h)
        const lastActive = user.state?.lastActive;
        const hoursInactive = lastActive ? (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60) : 999;

        if (hoursInactive > 48) {
            return { eligible: true, reason: 'inactive_gt_48h' };
        }

        return { eligible: false, reason: 'no_target_state', skipReason: 'User is active and healthy' };
    }

    /**
     * dispatchEmail
     * Sends the email and records the event for causal tracking.
     */
    async dispatchEmail(userId: string, template: string, reason: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { state: true } });
        if (!user) return;

        // INVARIANT: Control Group Check (Safety Net)
        if (user.state?.experimentGroup === 'control') {
            await this.trackingService.track({
                event: 'control_notification_blocked',
                userId,
                context: { reason: 'Dispatcher Invariant Violation Attempt' }
            });
            throw new Error(`CRITICAL: Attempted to dispatch to CONTROL group user ${userId}`);
        }

        const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }); // YYYY-MM-DD
        const dedupeKey = `${userId}:${template}:${dateStr}`;

        try {
            // Idempotency Pre-Check (DB Unique Constraint will fail, but this saves API call)
            // Rely on DB constraint mainly, but we check here if we want to skip silently?
            // Let's rely on Prisma create throwing or try/catch.

            if (process.env.NOTIFICATION_DRY_RUN === 'true') {
                logger.info({ userId, reason, template }, 'DRY RUN: Notification would be sent');
                return;
            }

            // Send
            let result: { id?: string } = { id: 'simulated' };
            try {
                result = await this.emailProvider.sendEmail(
                    user.email,
                    'HealthOS — state capture available',
                    `The system is available if you want to capture your current state.\n\n[ OPEN HEALTHOS ]`
                );
            } catch (providerError) {
                // If provider fails, we log and do NOT create the 'sent' event
                throw providerError;
            }

            // Record NotificationEvent with Dedupe Key
            await (this.prisma as any).notificationEvent.create({
                data: {
                    userId,
                    channel: 'email',
                    type: template,
                    experimentGroup: user.state?.experimentGroup || 'unknown',
                    reason,
                    status: 'sent',
                    providerId: result.id,
                    dedupeKey: dedupeKey // Enforces 1 per day per type
                }
            });

            // Record Analytics Event
            await this.trackingService.track({
                event: 'notification_sent',
                userId,
                context: {
                    type: template,
                    channel: 'email',
                    reason
                }
            });

            logger.info({ userId, reason }, 'Notification dispatched successfully');

        } catch (error: any) {
            if (error.code === 'P2002') { // Prisma unique constraint violation
                logger.warn({ userId, dedupeKey }, 'Skipped duplicate notification (Idempotency)');
                await (this.prisma as any).notificationEvent.create({
                    data: {
                        userId,
                        channel: 'email',
                        type: template,
                        experimentGroup: user.state?.experimentGroup || 'unknown',
                        reason,
                        status: 'skipped_duplicate',
                        metadata: { attemptedAt: new Date() }
                    }
                });
            } else {
                logger.error({ error, userId }, 'Failed to dispatch notification');
                // Record failed attempt (no dedupe key to allow retry?)
                await (this.prisma as any).notificationEvent.create({
                    data: {
                        userId,
                        channel: 'email',
                        type: template,
                        experimentGroup: user.state?.experimentGroup || 'unknown',
                        reason,
                        status: 'failed',
                        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
                    }
                });
            }
        }
    }

    /**
     * runDailyNotifications
     * The main entry point for the cron job.
     */
    async runDailyNotifications() {
        if (process.env.BETA_FREEZE === 'true') {
            logger.info('Daily notifications skipped due to BETA_FREEZE');
            return;
        }

        logger.info('Starting Daily Notification Hub run');

        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // Get candidates: Users inactive for > 48h
        const candidates = await this.prisma.user.findMany({
            where: {
                state: {
                    lastActive: { lt: fortyEightHoursAgo }
                }
            }
        });

        let dispatched = 0;
        const CAP = parseInt(process.env.NOTIFICATION_DAILY_CAP || '50', 10);

        for (const user of candidates) {
            if (dispatched >= CAP) {
                logger.warn('Daily notification CAP reached');
                break;
            }

            const eligibility = await this.computeEligibility(user.id);

            if (eligibility.eligible) {
                await this.dispatchEmail(user.id, 'nudge_return', eligibility.reason);
                if (process.env.NOTIFICATION_DRY_RUN !== 'true') {
                    dispatched++;
                }
            }
        }

        logger.info({ dispatched, candidates: candidates.length, cap: CAP }, 'Daily Notification Hub run completed');
    }

    /**
     * computeNotificationUplift
     * Validates effectiveness of notifications by comparing sent vs candidate baseline.
     */
    async computeNotificationUplift() {
        // Window: 24h to 48h ago (to allow full 24h response window)
        const now = new Date();
        const windowEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        const prisma = this.prisma as any;

        // 1. Sent Cohort
        const sentNotifications = await prisma.notificationEvent.findMany({
            where: {
                sentAt: { gte: windowStart, lte: windowEnd },
                status: 'sent'
            }
        });

        // 2. Candidates Cohort (Approximate)
        // We find users who were inactive > 48h at the START of the window.
        // This is tricky to reconstruct perfectly without logging candidates.
        // For MVP, we use "sent + skipped". But we don't log all skips.
        // So we fallback to: All users who were inactive > 48h relative to windowStart.
        const candidates = await this.prisma.user.findMany({
            where: {
                state: {
                    lastActive: { lt: new Date(windowStart.getTime() - 48 * 60 * 60 * 1000) }
                }
            }
        });

        // Candidate baseline return rate (returned in the 24h window after windowStart)
        let candidatesReturned = 0;
        for (const c of candidates) {
            const userState = await this.prisma.userState.findUnique({ where: { userId: c.id } });
            // Did they become active in the window [windowStart, windowStart + 24h]?
            const lastActive = userState?.lastActive ? new Date(userState.lastActive) : null;
            if (lastActive && lastActive > windowStart && lastActive <= windowEnd) {
                candidatesReturned++;
            }
        }
        const candidateRate = candidates.length > 0 ? (candidatesReturned / candidates.length) : 0;

        // Sent return rate (returned in 24h after send)
        let sentReturned = 0;
        for (const n of sentNotifications) {
            const userState = await this.prisma.userState.findUnique({ where: { userId: n.userId } });
            if (userState?.lastActive && new Date(userState.lastActive) > new Date(n.sentAt)) {
                sentReturned++;
            }
        }
        const sentRate = sentNotifications.length > 0 ? (sentReturned / sentNotifications.length) : 0;

        // Uplift = Sent Rate - General Candidate Baseline Rate
        const uplift = sentRate - candidateRate;

        return {
            window: '24h-48h ago',
            candidatesN: candidates.length,
            sentN: sentNotifications.length,
            return24h_candidate_rate: candidateRate,
            return24h_sent_rate: sentRate,
            uplift: uplift
        };
    }
}
