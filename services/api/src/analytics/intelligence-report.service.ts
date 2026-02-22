import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GrowthIntelligenceService } from './growth-intelligence.service';
import { GrowthService } from './growth.service';
import { ReactivationService } from './reactivation.service';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';
import { BaselineService } from '../metrics/baseline.service';

@Injectable()
export class IntelligenceReportService {
    private readonly logger = new Logger(IntelligenceReportService.name);

    constructor(
        private growthIntel: GrowthIntelligenceService,
        private growth: GrowthService,
        private reactivation: ReactivationService,
        private alerts: SystemAlertsService,
        private baseline: BaselineService
    ) { }

    /**
     * Weekly Intelligence Report
     * Runs every Monday at 08:00 AM
     */
    @Cron('0 8 * * 1')
    async generateWeeklyIntelligence() {
        this.logger.log('Generating Weekly Intelligence Report...');

        try {
            const growthInsights = await this.growthIntel.getConversionInsights(7);
            const funnel = await this.growth.getFunnel(7);
            const baselines = this.baseline.getAllBaselines();

            // Find key indicators
            const errorsBaseline = baselines.find(b => b.name === 'errors_5xx_per_min');
            const apiHealth = (!errorsBaseline || errorsBaseline.mean < 0.1) ? '✅ Excellent' : '⚠️ Stable (some noise)';

            const conversionStage = funnel.find(f => f.id === 'conversion_v1');
            const totalConversions = conversionStage?.count || 0;

            const topGrowthSig = growthInsights.insights?.[0];
            const growthSummary = topGrowthSig
                ? `🚀 *Top Growth Signal:* ${topGrowthSig.feature} (${topGrowthSig.rate.toFixed(1)}% attribution)`
                : '📈 *Growth Signal:* No significant patterns yet.';

            const report = `
📊 *HealthOS Weekly Intelligence*
-----------------------------
${growthSummary}
💰 *Weekly Conversions:* ${totalConversions}
🏥 *API Health:* ${apiHealth}
📅 *Period:* Last 7 Days

${growthInsights.insights && growthInsights.insights.length > 0 ? '*Top Feature Insights:*' : ''}
${growthInsights.insights?.slice(0, 3).map(i => `- ${i.feature}: ${i.rate.toFixed(1)}% attr.`).join('\n') || ''}

[View Growth Dashboard](https://admin.healthos.com/admin/growth)
            `;

            await this.alerts.triggerAlert('weekly_report', 'info', report, {
                totalConversions,
                featuresTracked: growthInsights.insights?.length
            });

            this.logger.log('Weekly Intelligence Report sent.');
        } catch (e: any) {
            this.logger.error(`Failed to generate weekly report: ${e.message}`);
        }
    }

    /**
     * Daily Engagement Scan
     * Runs every day at 09:00 AM
     */
    @Cron('0 9 * * *')
    async scanForReactivation() {
        this.logger.log('Starting daily reactivation scan...');
        try {
            const count = await this.reactivation.scanForInactiveUsers();
            this.logger.log(`Daily reactivation scan completed. Found ${count} candidates.`);
        } catch (e: any) {
            this.logger.error(`Failed to run reactivation scan: ${e.message}`);
        }
    }
}
