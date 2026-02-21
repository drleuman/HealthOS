import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';

@Injectable()
export class AlertEngineService implements OnModuleInit {
    private readonly logger = new Logger(AlertEngineService.name);

    constructor(
        private metrics: MetricsService,
        private systemAlerts: SystemAlertsService
    ) { }

    onModuleInit() {
        // Evaluate rules every 30s
        setInterval(() => this.evaluateRules(), 30000);
    }

    async evaluateRules() {
        const metrics = await this.metrics.getSystemHealthMetrics();
        const currentBucket = (this.metrics as any).getOrCreateBucket((this.metrics as any).getBucketKey());

        // Rule 1: 5xx Spike
        if (currentBucket.errors5xx > 10) {
            await this.systemAlerts.triggerAlert(
                'api_5xx_spike',
                'critical',
                `High error rate detected: ${currentBucket.errors5xx} errors in the last minute.`,
                { errors: currentBucket.errors5xx }
            );
        }

        // Rule 2: Rate Limit Spike
        if (currentBucket.rateLimitHits > 50) {
            await this.systemAlerts.triggerAlert(
                'rate_limit_spike',
                'warn',
                `Rate limiting activity is high: ${currentBucket.rateLimitHits} blocks in the last minute.`,
                { blocks: currentBucket.rateLimitHits }
            );
        }

        // Rule 3: Auth Abuse (Login failures)
        if (currentBucket.loginFailures > 20) {
            await this.systemAlerts.triggerAlert(
                'refresh_fail_spike', // Reusing this or could add 'auth_abuse'
                'critical',
                `Suspicious login activity: ${currentBucket.loginFailures} failures in the last minute.`,
                { failures: currentBucket.loginFailures }
            );
        }

        // Rule 4: Latency Degradation
        const p95 = currentBucket.latencies.length > 0
            ? [...currentBucket.latencies].sort((a: number, b: number) => a - b)[Math.floor(currentBucket.latencies.length * 0.95)]
            : 0;

        if (p95 > 1500) {
            await this.systemAlerts.triggerAlert(
                'api_5xx_spike', // Or new type 'latency_degradation'
                'warn',
                `System latency is high: P95 is ${p95}ms.`,
                { p95 }
            );
        }

        // Rule 5: Token Reuse
        if (currentBucket.tokenReuse > 0) {
            await this.systemAlerts.triggerAlert(
                'auth_reuse_detected',
                'critical',
                `${currentBucket.tokenReuse} token reuse attempts detected in the last minute.`,
                { count: currentBucket.tokenReuse }
            );
        }
    }
}
