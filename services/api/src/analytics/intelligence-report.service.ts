import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GrowthIntelligenceService } from './growth-intelligence.service';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';
import { BaselineService } from '../metrics/baseline.service';

@Injectable()
export class IntelligenceReportService {
    private readonly logger = new Logger(IntelligenceReportService.name);

    constructor(
        private growth: GrowthIntelligenceService,
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
            const growthInsights = await this.growth.getConversionInsights(7);
            const baselines = this.baseline.getAllBaselines();

            // Find key indicators
            const errorsBaseline = baselines.find(b => b.name === 'errors_5xx_per_min');
            const apiHealth = (!errorsBaseline || errorsBaseline.mean < 0.1) ? '✅ Excellent' : '⚠️ Stable (some noise)';

            const topGrowthSig = growthInsights.insights?.[0];
            const growthSummary = topGrowthSig
                ? `🚀 *Top Growth Signal:* ${topGrowthSig.feature} (${topGrowthSig.rate.toFixed(1)}% attribution)`
                : '📈 *Growth Signal:* No significant patterns yet.';

            const report = `
📊 *HealthOS Weekly Intelligence*
-----------------------------
${growthSummary}
🏥 *API Health:* ${apiHealth}
📅 *Period:* Last 7 Days

${growthInsights.insights && growthInsights.insights.length > 0 ? '*Top Feature Insights:*' : ''}
${growthInsights.insights?.slice(0, 3).map(i => `- ${i.feature}: ${i.rate.toFixed(1)}% attr.`).join('\n') || ''}

[View Full Insights Dashboard](https://admin.healthos.com/admin/insights)
            `;

            await this.alerts.triggerAlert('weekly_report', 'info', report, {
                totalConversions: growthInsights.total,
                featuresTracked: growthInsights.insights?.length
            });

            this.logger.log('Weekly Intelligence Report sent.');
        } catch (e: any) {
            this.logger.error(`Failed to generate weekly report: ${e.message}`);
        }
    }
}
