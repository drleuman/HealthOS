import { Module, forwardRef } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma.service';
import { BaselineService } from './baseline.service';
import { AnomalyService } from './anomaly.service';
import { SystemAlertsModule } from '../system-alerts/system-alerts.module';

@Module({
    imports: [forwardRef(() => SystemAlertsModule)],
    providers: [MetricsService, PrismaService, BaselineService, AnomalyService],
    exports: [MetricsService, BaselineService, AnomalyService],
})
export class MetricsModule { }
