import { Module } from '@nestjs/common';
import { GrowthIntelligenceService } from './growth-intelligence.service';
import { IntelligenceReportService } from './intelligence-report.service';
import { AbuseIntelligenceService } from './abuse-intelligence.service';
import { SelfHealingService } from './self-healing.service';
import { SystemAlertsModule } from '../system-alerts/system-alerts.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PrismaService } from '../prisma.service';

@Module({
    imports: [
        SystemAlertsModule,
        MetricsModule
    ],
    providers: [
        GrowthIntelligenceService,
        IntelligenceReportService,
        AbuseIntelligenceService,
        SelfHealingService,
        PrismaService
    ],
    exports: [
        GrowthIntelligenceService,
        IntelligenceReportService,
        AbuseIntelligenceService,
        SelfHealingService
    ]
})
export class AnalyticsModule { }
