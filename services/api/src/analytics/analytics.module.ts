/** TECHNICAL FREEZE ACTIVE: 2026-02-22 to 2026-03-08. No feature changes. */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetricsModule } from '../metrics/metrics.module';
import { PrismaService } from '../prisma.service';
import { SystemAlertsModule } from '../system-alerts/system-alerts.module';

import { AbuseIntelligenceService } from './abuse-intelligence.service';
import { AnalyticsIntegrationService } from './analytics-integration.service';
import { ExperimentService } from './experiment.service';
import { GrowthIntelligenceService } from './growth-intelligence.service';
import { GrowthService } from './growth.service';
import { IntelligenceReportService } from './intelligence-report.service';
import { ReactivationService } from './reactivation.service';
import { SelfHealingService } from './self-healing.service';

@Module({
    imports: [
        SystemAlertsModule,
        MetricsModule,
        ConfigModule
    ],
    providers: [
        GrowthIntelligenceService,
        GrowthService,
        ReactivationService,
        ExperimentService,
        AnalyticsIntegrationService,
        IntelligenceReportService,
        AbuseIntelligenceService,
        SelfHealingService,
        PrismaService
    ],
    exports: [
        GrowthIntelligenceService,
        GrowthService,
        ReactivationService,
        ExperimentService,
        AnalyticsIntegrationService,
        IntelligenceReportService,
        AbuseIntelligenceService,
        SelfHealingService
    ]
})
export class AnalyticsModule { }
