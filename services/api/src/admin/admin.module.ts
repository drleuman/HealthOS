import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { TrackingService } from '../tracking.service';

import { MetricsModule } from '../metrics/metrics.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SystemAlertsModule } from '../system-alerts/system-alerts.module';

@Module({
    imports: [MetricsModule, AnalyticsModule, SystemAlertsModule],
    controllers: [AdminController],
    providers: [AdminService, PrismaService, TrackingService],
    exports: [AdminService]
})
export class AdminModule { }
