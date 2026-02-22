import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbuseIntelligenceService } from './abuse-intelligence.service';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';

@Injectable()
export class SelfHealingService {
    private readonly logger = new Logger(SelfHealingService.name);
    private isStrictRateLimitingActive = false;

    constructor(
        private abuse: AbuseIntelligenceService,
        private alerts: SystemAlertsService
    ) { }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async evaluateSystemSafety() {
        const patterns = await this.abuse.detectAbusePatterns();

        // patterns.authAbuse might be the aggregate count or array
        const authAbuseDetected = Array.isArray(patterns.authAbuse) && patterns.authAbuse.length > 0;

        if (patterns.floods || authAbuseDetected) {
            this.activateProtectiveMeasures();
        } else if (this.isStrictRateLimitingActive) {
            this.deactivateProtectiveMeasures();
        }
    }

    private activateProtectiveMeasures() {
        if (this.isStrictRateLimitingActive) return;

        this.isStrictRateLimitingActive = true;
        this.logger.warn('ACTIVATE: Protective measures (Strict Rate Limiting) due to abuse detection.');

        this.alerts.triggerAlert(
            'self_healing_activated',
            'critical',
            'System protective measures (Strict Rate Limiting) activated due to detected abuse patterns.'
        );
    }

    private deactivateProtectiveMeasures() {
        this.isStrictRateLimitingActive = false;
        this.logger.log('DEACTIVATE: Protective measures. Normal operation resumed.');

        this.alerts.triggerAlert(
            'self_healing_deactivated',
            'info',
            'System protective measures deactivated. Normal operation resumed.'
        );
    }

    public isThrottlingTightened(): boolean {
        return this.isStrictRateLimitingActive;
    }
}
