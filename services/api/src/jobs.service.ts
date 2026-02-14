import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { logger } from './logger';
import { SERService } from './analytics/ser.service';

@Injectable()
export class JobsService {
    constructor(
        private prisma: PrismaService,
        private serService: SERService
    ) { }

    /**
     * Check for inactive users (no activity in 48h)
     * Send them a gentle reminder via job result
     */
    async checkInactiveUsers() {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

        try {
            const inactiveUsers = await this.prisma.userState.findMany({
                where: {
                    lastActive: {
                        lt: cutoff,
                    },
                },
                include: { user: true },
            });

            logger.info({ count: inactiveUsers.length }, 'Checking inactive users');

            for (const state of inactiveUsers) {
                if (!state.user) continue;

                // Create a job result that will show as a banner
                await this.prisma.jobResult.create({
                    data: {
                        userId: state.user.id,
                        jobType: 'inactivity_check',
                        status: 'success',
                        message: '¡Te echamos de menos! Han pasado 48 horas desde tu última actividad.',
                        data: {
                            lastActive: state.lastActive,
                            currentDay: state.currentDay,
                            streak: state.streak,
                        },
                    },
                });

                logger.info({ userId: state.user.id, email: state.user.email }, 'Created inactivity reminder');
            }

            return { processed: inactiveUsers.length };
        } catch (error) {
            logger.error({ error }, 'Error checking inactive users');
            throw error;
        }
    }

    /**
     * Generate weekly summary for active users
     */
    async generateWeeklySummaries() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        try {
            const users = await this.prisma.user.findMany({
                where: {
                    state: {
                        lastActive: {
                            gte: oneWeekAgo,
                        },
                    },
                },
                include: {
                    state: true,
                    logs: {
                        where: {
                            createdAt: {
                                gte: oneWeekAgo,
                            },
                        },
                    },
                },
            });

            logger.info({ count: users.length }, 'Generating weekly summaries');

            for (const user of users) {
                const completedDays = user.logs.filter(l => l.actionCompleted).length;
                const totalDays = user.logs.length;
                const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

                await this.prisma.jobResult.create({
                    data: {
                        userId: user.id,
                        jobType: 'weekly_summary',
                        status: 'success',
                        message: `Resumen semanal: ${completedDays}/${totalDays} días completados (${completionRate}%)`,
                        data: {
                            completedDays,
                            totalDays,
                            completionRate,
                            currentStreak: user.state?.streak || 0,
                            currentDay: user.state?.currentDay || 1,
                        },
                    },
                });

                logger.info({ userId: user.id, completedDays, totalDays }, 'Created weekly summary');
            }

            return { processed: users.length };
        } catch (error) {
            logger.error({ error }, 'Error generating weekly summaries');
            throw error;
        }
    }

    /**
     * Get pending job results for a user (for banner display)
     */
    async getPendingJobResults(userId: string) {
        return this.prisma.jobResult.findMany({
            where: {
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 3, // Show max 3 banners
        });
    }

    /**
     * Mark job result as seen/dismissed
     */
    async dismissJobResult(id: string) {
        return this.prisma.jobResult.delete({
            where: { id },
        });
    }

    /**
     * Run Spontaneous Engagement Return Analysis
     */
    async runSERAnalysis() {
        logger.info('Starting SER Analysis Job...');
        const now = new Date();
        const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        try {
            const result = await this.serService.computeSERDistribution(aWeekAgo, now);

            // Store as a system-wide job result (no userId)
            await this.prisma.jobResult.create({
                data: {
                    jobType: 'ser_analysis',
                    status: 'success',
                    message: 'SER Analysis Complete',
                    data: result as any
                }
            });

            logger.info('SER Analysis Job Complete.');
            return result;
        } catch (error: any) {
            logger.error({ error }, 'SER Analysis Job failed');
            throw error;
        }
    }
}
