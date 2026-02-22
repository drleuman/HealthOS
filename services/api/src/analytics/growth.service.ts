import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GrowthService {
    private readonly logger = new Logger(GrowthService.name);

    constructor(private prisma: PrismaService) { }

    async getFunnel(days: number = 30) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Define our primary growth funnel stages
        const stages = [
            { id: 'landing', label: 'Landing Visit', events: ['landing_visit'] },
            { id: 'quiz', label: 'Quiz Started', events: ['quiz_start'] },
            { id: 'result', label: 'Result Viewed', events: ['onboarding_completed_anonymous', 'onboarding_completed'] },
            { id: 'signup', label: 'Signup Success', model: 'user' },
            { id: 'activation', label: 'First Log (D1)', events: ['day_completed'], day: 1 },
            { id: 'conversion', label: 'Paid Conversion', model: 'purchase' }
        ];

        const funnelData: any[] = [];

        for (const stage of stages) {
            let count = 0;
            if (stage.model === 'user') {
                count = await this.prisma.user.count({
                    where: { createdAt: { gte: startDate } }
                });
            } else if (stage.model === 'purchase') {
                count = await (this.prisma as any).purchase.count({
                    where: { createdAt: { gte: startDate } }
                });
            } else if (stage.events) {
                count = await (this.prisma as any).event.count({
                    where: {
                        event: { in: stage.events },
                        createdAt: { gte: startDate },
                        // Add specific context filters if needed (e.g. day: 1)
                        ...(stage.day ? { context: { path: ['day'], equals: stage.day } } : {})
                    }
                });
            }

            funnelData.push({
                ...stage,
                count
            });
        }

        // Calculate conversion rates
        return funnelData.map((stage, index) => {
            const previousCount = index > 0 ? funnelData[index - 1].count : stage.count;
            const conversionRate = previousCount > 0 ? (stage.count / previousCount) * 100 : 0;
            const dropRate = 100 - conversionRate;

            return {
                ...stage,
                rate: conversionRate,
                drop: dropRate
            };
        });
    }

    async getRetentionStats() {
        // ... (existing code stays same)
    }

    /**
     * getCohortRetention
     * Calculates retention by signup week (Cohort Heatmap)
     */
    async getCohortRetention(weeks: number = 8) {
        const results = [];
        const now = new Date();

        for (let i = 0; i < weeks; i++) {
            const startOfWeek = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
            const endOfWeek = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

            const cohortSize = await this.prisma.user.count({
                where: {
                    createdAt: { gte: startOfWeek, lt: endOfWeek }
                }
            });

            if (cohortSize === 0) continue;

            const retentionByDay = [];
            // Calculate Day 1, Day 7, Day 14, Day 28 retention
            const retentionDays = [1, 7, 14, 28];

            for (const day of retentionDays) {
                const dayThreshold = new Date(endOfWeek.getTime() + day * 24 * 60 * 60 * 1000);
                if (dayThreshold > now) break;

                const activeCount = await this.prisma.user.count({
                    where: {
                        createdAt: { gte: startOfWeek, lt: endOfWeek },
                        lastSeen: { gte: dayThreshold }
                    }
                });

                retentionByDay.push({
                    day,
                    rate: (activeCount / cohortSize) * 100
                });
            }

            results.push({
                week: startOfWeek.toISOString().split('T')[0],
                size: cohortSize,
                retention: retentionByDay
            });
        }

        return results;
    }
}
