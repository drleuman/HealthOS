import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { JobsService } from './jobs.service';
import { BehaviorService } from './behavior.service';
import { logger } from './logger';
import { OpsDigestService } from './analytics/ops-digest.service';
import { ReactivationService } from './analytics/reactivation.service';
import { PrismaService } from './prisma.service';

import { NotificationHubService } from './notifications/notification-hub.service';
import { StateTrajectoryService } from './behavioral/state-trajectory.service';

@Injectable()
export class JobScheduler implements OnModuleInit, OnModuleDestroy {
    private tasks: cron.ScheduledTask[] = [];

    constructor(
        private jobsService: JobsService,
        private behaviorService: BehaviorService,
        private opsDigestService: OpsDigestService,
        private prisma: PrismaService,
        private notificationHub: NotificationHubService,
        private trajectoryService: StateTrajectoryService,
        private reactivationService: ReactivationService
    ) { }

    onModuleInit() {
        // Run inactivity check every 6 hours
        const inactivityTask = cron.schedule('0 */6 * * *', async () => {
            logger.info('Running inactivity check job');
            try {
                const result = await this.jobsService.checkInactiveUsers();
                logger.info(result, 'Inactivity check completed');
            } catch (error) {
                logger.error({ error }, 'Inactivity check failed');
            }
        });

        // Run weekly summary every Monday at 9 AM
        const summaryTask = cron.schedule('0 9 * * 1', async () => {
            logger.info('Running weekly summary job');
            try {
                const result = await this.jobsService.generateWeeklySummaries();
                logger.info(result, 'Weekly summary completed');
            } catch (error) {
                logger.error({ error }, 'Weekly summary failed');
            }
        });

        // Behavioral Analysis Engine (Hourly)
        const behaviorTask = cron.schedule('0 * * * *', async () => {
            logger.info('Running behavioral analysis engine');
            try {
                await this.behaviorService.runBehaviorAnalysisJob();
            } catch (error) {
                logger.error({ error }, 'Behavioral analysis failed');
            }
        });

        // SER Analysis (Every 12 hours)
        const serTask = cron.schedule('0 */12 * * *', async () => {
            logger.info('Running SER analysis job');
            try {
                await this.jobsService.runSERAnalysis();
            } catch (error) {
                logger.error({ error }, 'SER analysis failed');
            }
        });

        // Auto-Ops Daily Digest (09:00 Europe/Madrid)
        const digestTask = cron.schedule('0 9 * * *', async () => {
            logger.info('Running Auto-Ops Daily Digest');
            try {
                // Idempotency Check
                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                const endOfDay = new Date(today.setHours(23, 59, 59, 999));

                const existing = await this.prisma.jobResult.findFirst({
                    where: {
                        jobType: 'daily_digest',
                        createdAt: { gte: startOfDay, lte: endOfDay }
                    }
                });

                if (existing) {
                    logger.info('Daily digest already ran today. Skipping.');
                    return;
                }

                const result = await this.opsDigestService.runDailyDigest({ tz: 'Europe/Madrid' });

                // Persist Result
                await this.prisma.jobResult.create({
                    data: {
                        jobType: 'daily_digest',
                        status: 'success',
                        message: result.layer1Message,
                        data: result as any
                    }
                });

                // Action Dispatcher (Log + Webhook placeholder)
                logger.info({ digest: result.layer1Message }, 'Daily Digest Completed');

                if (process.env.OPS_WEBHOOK_URL) {
                    // Simple fetch to webhook would go here
                    // await fetch(process.env.OPS_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text: result.layer1Message }) });
                }

            } catch (error) {
                logger.error({ error }, 'Auto-Ops Daily Digest failed');
                // Fail-safe persistence
                await this.prisma.jobResult.create({
                    data: {
                        jobType: 'daily_digest',
                        status: 'error',
                        message: 'System Failure',
                        data: { error: error instanceof Error ? error.message : 'Unknown' }
                    }
                });
            }
        }, { timezone: 'Europe/Madrid' });

        // Engagement Notifications (10:00 Europe/Madrid)
        const notificationTask = cron.schedule('0 10 * * *', async () => {
            logger.info('Running Engagement Notification Hub');
            try {
                await this.notificationHub.runDailyNotifications();
            } catch (error) {
                logger.error({ error }, 'Engagement Notification Hub failed');
            }
        }, { timezone: 'Europe/Madrid' });

        // Biological State Reconstruction (03:00 Europe/Madrid)
        const snapshotTask = cron.schedule('0 3 * * *', async () => {
            logger.info('Running Biological State Reconstruction');
            try {
                const activeUsers = await this.prisma.user.findMany({
                    where: { state: { lastActive: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } } },
                    select: { id: true }
                });

                for (const user of activeUsers) {
                    await this.trajectoryService.reconstructState(user.id);
                }

                await this.prisma.jobResult.create({
                    data: {
                        jobType: 'state_reconstruction',
                        status: 'success',
                        message: `Processed ${activeUsers.length} users`
                    }
                });
            } catch (error) {
                logger.error({ error }, 'State Reconstruction Job failed');
            }
        }, { timezone: 'Europe/Madrid' });

        // Daily Reactivation Scan (08:00 Europe/Madrid)
        const reactivationTask = cron.schedule('0 8 * * *', async () => {
            logger.info('Running Daily Reactivation Scan');
            try {
                const processed = await this.reactivationService.scanForInactiveUsers();
                logger.info({ processed }, 'Reactivation scan completed');
            } catch (error) {
                logger.error({ error }, 'Reactivation scan failed');
            }
        }, { timezone: 'Europe/Madrid' });

        this.tasks.push(inactivityTask, summaryTask, behaviorTask, serTask, digestTask, notificationTask, snapshotTask, reactivationTask);
        logger.info('Job scheduler initialized with 8 cron tasks');
    }

    onModuleDestroy() {
        this.tasks.forEach(task => task.stop());
        logger.info('Job scheduler stopped');
    }

    // Manual trigger methods for testing
    async triggerInactivityCheck() {
        logger.info('Manually triggering inactivity check');
        return this.jobsService.checkInactiveUsers();
    }

    async triggerWeeklySummary() {
        logger.info('Manually triggering weekly summary');
        return this.jobsService.generateWeeklySummaries();
    }

    async triggerBehaviorAnalysis() {
        logger.info('Manually triggering behavioral analysis');
        return this.behaviorService.runBehaviorAnalysisJob();
    }

    async triggerSERAnalysis() {
        logger.info('Manually triggering SER analysis');
        return this.jobsService.runSERAnalysis();
    }

    async triggerStateReconstruction() {
        logger.info('Manually triggering State Reconstruction');
        const users = await this.prisma.user.findMany({ select: { id: true } });
        for (const user of users) {
            await this.trajectoryService.reconstructState(user.id);
        }
        return { processed: users.length };
    }
}
