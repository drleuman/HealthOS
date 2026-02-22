import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';
import { AnomalyService } from '../metrics/anomaly.service';

@Injectable()
export class AlertEngineService implements OnModuleInit {
    private readonly logger = new Logger(AlertEngineService.name);

    constructor(
        private metrics: MetricsService,
        private systemAlerts: SystemAlertsService,
        private anomaly: AnomalyService
    ) { }

    onModuleInit() {
        // Evaluate rules every 30s
        setInterval(() => this.evaluateRules(), 30000);
    }

    async evaluateRules() {
        // Run anomaly detection
        const anomalies = await this.anomaly.detectAnomalies();

        // Trigger alerts for each detected anomaly
        for (const anomaly of anomalies) {
            await this.systemAlerts.triggerAlert(
                `anomaly_${anomaly.metric}`,
                anomaly.type.includes('spike') ? 'critical' : 'warn',
                `Intelligence: ${anomaly.type.toUpperCase()} on ${anomaly.metric}. Current: ${anomaly.value.toFixed(2)} (Baseline: ${anomaly.baseline.toFixed(2)})`,
                anomaly
            );
        }

        // Keep legacy rules for safety but with lower priority if needed, 
        // or just rely 100% on AnomalyService as it covers most of these.
        // For Sprint 3, the objective is to MOVE to intelligent monitoring.
    }
}
