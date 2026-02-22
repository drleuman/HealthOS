import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class HealthDataService {
    private readonly logger = new Logger(HealthDataService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Ingest multiple metrics from an external source.
     */
    async ingestMetrics(userId: string, source: string, metrics: Array<{ type: string; value: number; unit?: string; timestamp: Date; metadata?: any }>) {
        this.logger.log(`Ingesting ${metrics.length} metrics for user ${userId} from ${source}`);

        try {
            await (this.prisma as any).externalMetric.createMany({
                data: metrics.map(m => ({
                    userId,
                    source,
                    type: this.normalizeType(m.type),
                    value: m.value,
                    unit: m.unit,
                    timestamp: m.timestamp,
                    metadata: m.metadata || {}
                }))
            });
            return { ok: true, count: metrics.length };
        } catch (e) {
            this.logger.error(`Failed to ingest metrics for ${userId}`, e);
            return { ok: false, error: 'Ingestion failed' };
        }
    }

    /**
     * normalizeType
     * Ensures all external sources map to the same internal taxonomy.
     */
    private normalizeType(externalType: string): string {
        const mapping: Record<string, string> = {
            'steps': 'steps',
            'step_count': 'steps',
            'SleepDuration': 'sleep',
            'sleep_seconds': 'sleep',
            'resting_heart_rate': 'resting_hr',
            'heart_rate_variability': 'hrv',
            'HRV': 'hrv',
            'active_energy_burned': 'activity'
        };

        return mapping[externalType] || externalType.toLowerCase();
    }

    /**
     * getLatestMetrics
     * Reach back into the DB to get normalized metrics for a user.
     */
    async getLatestMetrics(userId: string, types: string[], days: number = 7) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        return await (this.prisma as any).externalMetric.findMany({
            where: {
                userId,
                type: { in: types },
                timestamp: { gte: since }
            },
            orderBy: { timestamp: 'desc' }
        });
    }
}
