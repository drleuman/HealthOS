import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface Baseline {
    name: string;
    mean: number;
    stdDev: number;
    p95: number;
    p99: number;
    updatedAt: Date;
}

@Injectable()
export class BaselineService implements OnModuleInit {
    private readonly logger = new Logger(BaselineService.name);
    private baselines = new Map<string, Baseline>();

    constructor(private prisma: PrismaService) { }

    onModuleInit() {
        // Wait a bit for other services to initialize
        setTimeout(() => this.recalculateAll(), 5000);
        // Recalculate every hour
        setInterval(() => this.recalculateAll(), 3600000);
    }

    async recalculateAll() {
        this.logger.log('Recalculating all baselines...');
        try {
            // Get last 7 days of 1-minute metrics
            const metrics = await (this.prisma as any).metricSnapshot.findMany({
                where: {
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    window: '1m'
                },
                select: {
                    name: true,
                    value: true
                }
            });

            if (metrics.length === 0) {
                this.logger.warn('No metrics found for baseline calculation');
                return;
            }

            // Group by metric name
            const grouped = metrics.reduce((acc: any, current: any) => {
                if (!acc[current.name]) acc[current.name] = [];
                acc[current.name].push(current.value);
                return acc;
            }, {} as Record<string, number[]>);

            for (const [name, values] of Object.entries(grouped)) {
                this.calculateMetricBaseline(name, values as number[]);
            }

            this.logger.log(`Calculated baselines for ${Object.keys(grouped).length} metrics`);
        } catch (e: any) {
            this.logger.error(`Failed to recalculate baselines: ${e.message}`);
        }
    }

    private calculateMetricBaseline(name: string, values: number[]) {
        if (values.length === 0) return;

        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;

        const squareDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(avgSquareDiff);

        // Standard Deviation = 0 happens if all values are identical. 
        // We ensure a small stdDev to avoid division by zero or overly sensitive anomalies.
        const effectiveStdDev = stdDev === 0 ? mean * 0.05 : stdDev;

        const sorted = [...values].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];

        this.baselines.set(name, {
            name,
            mean,
            stdDev: effectiveStdDev,
            p95,
            p99,
            updatedAt: new Date()
        });
    }

    getBaseline(name: string): Baseline | undefined {
        return this.baselines.get(name);
    }

    getAllBaselines(): Baseline[] {
        return Array.from(this.baselines.values());
    }
}
