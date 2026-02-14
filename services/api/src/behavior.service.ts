import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { logger } from './logger';

@Injectable()
export class BehaviorService {
    constructor(private prisma: PrismaService) { }

    /**
     * computeSnapshotForUser
     * Definition of signals:
     * - startedDaysLast7: Distinct days where user either triggered 'day_started' or 'day_viewed'.
     * - completedDaysLast7: Distinct days where user triggered 'day_completed'.
     * - repeatedOpeningsSameDay: Count of 'day_viewed' or 'day_started' (excluding app_opened) 
     *   that happen multiple times for the exact same 'day' context today.
     * - inactive48h: True if 48h have passed since the absolute last event of any type.
     */
    async computeSnapshotForUser(userId: string, now: Date) {
        const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const prismaAny = this.prisma as any;

        // 1. Fetch Events
        const eventsLast7 = await this.prisma.event.findMany({
            where: {
                userId,
                timestamp: { gte: aWeekAgo }
            },
            select: { event: true, timestamp: true, context: true }
        });

        if (eventsLast7.length === 0) {
            return null; // No activity to snapshot
        }

        // 2. Compute Metrics

        // A) startedDaysLast7: distinct count of days with 'day_started' or 'day_viewed'
        const startedDays = new Set(
            eventsLast7
                .filter((e: any) => e.event === 'day_started' || e.event === 'day_viewed')
                .map((e: any) => e.timestamp.toISOString().split('T')[0])
        );
        const startedDaysLast7 = startedDays.size;

        // B) completedDaysLast7: distinct count of days with 'day_completed'
        const completedDaysLast7 = new Set(
            eventsLast7
                .filter((e: any) => e.event === 'day_completed')
                .map((e: any) => e.timestamp.toISOString().split('T')[0])
        ).size;

        // C) repeatedOpeningsSameDay (Friction signal)
        // Definition: Multiple 'day_viewed' or 'day_started' for the same 'day' context today
        const eventsToday = eventsLast7.filter((e: any) => e.timestamp >= startOfToday);
        const dayOpeningsMap: Record<number, number> = {};
        let repeatedCount = 0;

        eventsToday.forEach((e: any) => {
            if (e.event === 'day_viewed' || e.event === 'day_started') {
                const day = (e.context as any)?.day;
                if (day !== undefined) {
                    dayOpeningsMap[day] = (dayOpeningsMap[day] || 0) + 1;
                }
            }
            if (e.event === 'lesson_replayed') {
                repeatedCount++; // Direct signal
            }
        });

        // Add cases where same day was opened > 1 time
        Object.values(dayOpeningsMap).forEach(count => {
            if (count > 1) repeatedCount += (count - 1);
        });
        const repeatedOpeningsSameDay = repeatedCount;

        // D) inactive48h: last event using reduce (no mutation)
        const lastEventTimestamp = eventsLast7.reduce((latest: Date, current: any) => {
            return current.timestamp > latest ? current.timestamp : latest;
        }, new Date(0));

        const hoursSinceLastEvent = (now.getTime() - lastEventTimestamp.getTime()) / (1000 * 60 * 60);
        const inactive48h = hoursSinceLastEvent > 48;

        // 3. Upsert Snapshot
        return prismaAny.userBehaviorSnapshot.upsert({
            where: {
                userId_date: {
                    userId,
                    date: startOfToday
                }
            },
            update: {
                startedDaysLast7,
                completedDaysLast7,
                repeatedOpeningsSameDay,
                inactive48h,
            },
            create: {
                userId,
                date: startOfToday,
                startedDaysLast7,
                completedDaysLast7,
                repeatedOpeningsSameDay,
                inactive48h,
            }
        });
    }

    async determineState(snapshot: any) {
        let state = 'on_track';

        // Rule 1: Action too hard (started multiple times but never finished in a week)
        if (snapshot.startedDaysLast7 >= 2 && snapshot.completedDaysLast7 === 0) {
            state = 'action_too_hard';
        }
        // Rule 2: Instruction unclear / Technical friction (repeatedly opening same day without completion)
        else if (snapshot.repeatedOpeningsSameDay >= 3 && snapshot.completedDaysLast7 === 0) {
            state = 'instruction_unclear';
        }
        // Rule 3: Early dropoff (inactive after only 1-2 days of successful use)
        else if (snapshot.inactive48h && snapshot.completedDaysLast7 < 3) {
            state = 'early_dropoff';
        }
        // Rule 4: Motivation loss (inactive after a streak of 3+ days)
        else if (snapshot.inactive48h && snapshot.completedDaysLast7 >= 3) {
            state = 'motivation_loss';
        }

        return state;
    }

    async runBehaviorAnalysisJob() {
        logger.info('Starting Behavior Analysis Job...');
        const now = new Date();
        const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prismaAny = this.prisma as any;

        try {
            // Optimization: Only process users with events in the last 7 days
            const recentEvents = await this.prisma.event.findMany({
                where: {
                    timestamp: { gte: aWeekAgo },
                    userId: { not: null }
                },
                select: { userId: true },
                distinct: ['userId']
            });

            const activeUserIds = recentEvents.map((e: any) => e.userId as string);
            logger.info(`Processing behavior analysis for ${activeUserIds.length} active users.`);

            let processed = 0;
            for (const userId of activeUserIds) {
                try {
                    const snapshot = await this.computeSnapshotForUser(userId, now);
                    if (!snapshot) continue;

                    const state = await this.determineState(snapshot);

                    await prismaAny.userBehaviorState.upsert({
                        where: { userId },
                        update: { state },
                        create: { userId, state }
                    });
                    processed++;
                } catch (e: any) {
                    logger.error(`Behavior Job failed for user ${userId}: ${e.message}`);
                }
            }

            logger.info(`Behavior Analysis Job Complete. Processed ${processed} users.`);
            return { processed };
        } catch (error: any) {
            // Harden against missing migrations
            if (error.code === 'P2021' || error.message.includes('relation') || error.message.includes('UserBehavior')) {
                logger.error('Behavior tables missing — run migrations. Skipping job.');
                return { processed: 0, error: 'Database schema mismatch' };
            }
            throw error;
        }
    }

    async getUserState(userId: string) {
        const prismaAny = this.prisma as any;
        try {
            const state = await prismaAny.userBehaviorState.findUnique({
                where: { userId }
            });

            const lastSnapshot = await prismaAny.userBehaviorSnapshot.findFirst({
                where: { userId },
                orderBy: { date: 'desc' }
            });

            if (!state) return { state: 'unknown', lastSnapshot: null };

            return {
                ...state,
                lastSnapshot
            };
        } catch (e) {
            return { state: 'error', message: 'Migration missing or database issue' };
        }
    }
}
