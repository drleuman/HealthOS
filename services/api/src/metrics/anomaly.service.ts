import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaselineService } from './baseline.service';
import { PrismaService } from '../prisma.service';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';

@Injectable()
export class AnomalyService implements OnModuleInit {
    private readonly logger = new Logger(AnomalyService.name);

    constructor(
        private baseline: BaselineService,
        private prisma: PrismaService,
        private alerts: SystemAlertsService
    ) { }

    onModuleInit() {
        // Run anomaly check every 2 minutes
        setInterval(() => this.runAnomalyCheck(), 120000);
    }

    async runAnomalyCheck() {
        this.logger.log('Running anomaly detection check...');
        const anomalies = await this.detectAnomalies();

        for (const anomaly of anomalies) {
            await this.reportAnomaly(
                anomaly.type,
                anomaly.metric,
                anomaly.value,
                anomaly.baseline,
                anomaly.severity as any
            );
        }
    }

    async detectAnomalies(): Promise<any[]> {
        const baselines = this.baseline.getAllBaselines();
        const anomalies = [];

        for (const bl of baselines) {
            try {
                const lastMetric = await (this.prisma as any).metricSnapshot.findFirst({
                    where: { name: bl.name },
                    orderBy: { createdAt: 'desc' }
                });

                if (!lastMetric) continue;

                const value = lastMetric.value;
                const { mean, stdDev } = bl;
                const zScore = (value - mean) / stdDev;

                if (zScore > 3) {
                    anomalies.push({ type: 'spike', metric: bl.name, value, baseline: mean, severity: 'warn' });
                }

                if (zScore < -3 && (bl.name.includes('request') || bl.name.includes('success') || bl.name.includes('conversion'))) {
                    const severity = value < mean * 0.1 ? 'critical' : 'warn';
                    anomalies.push({ type: 'drop', metric: bl.name, value, baseline: mean, severity });
                }

                if (value === 0 && mean > 5 && (bl.name.includes('success') || bl.name.includes('conversion'))) {
                    anomalies.push({ type: 'pattern_break', metric: bl.name, value, baseline: mean, severity: 'critical' });
                }

            } catch (e: any) {
                this.logger.error(`Error detecting anomaly for ${bl.name}: ${e.message}`);
            }
        }
        return anomalies;
    }

    private async reportAnomaly(type: string, metric: string, value: number, baseline: number, severity: 'info' | 'warn' | 'critical') {
        const title = `Anomaly Detected: ${type} in ${metric}`;
        const message = `${metric} is currently ${value.toFixed(2)} (Baseline: ${baseline.toFixed(2)})`;

        this.logger.warn(`[ANOMALY] ${title} - ${message}`);

        try {
            // 1. Create Incident record
            await (this.prisma as any).incident.create({
                data: {
                    type: `anomaly_${type}`,
                    severity,
                    metric,
                    value,
                    baseline
                }
            });

            // 2. Trigger System Alert (Sends Telegram)
            await this.alerts.triggerAlert(
                `anomaly_${type}`,
                severity,
                `${title}\n${message}`,
                { value, baseline, metric }
            );
        } catch (e: any) {
            this.logger.error(`Failed to report anomaly: ${e.message}`);
        }
    }
}
