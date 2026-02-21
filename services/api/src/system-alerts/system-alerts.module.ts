import { Module } from '@nestjs/common';
import { SystemAlertsService } from './system-alerts.service';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma.service';
import { AlertEngineService } from '../alerts/alert-engine.service';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
    imports: [MetricsModule],
    providers: [SystemAlertsService, TelegramService, PrismaService, AlertEngineService],
    exports: [SystemAlertsService]
})
export class SystemAlertsModule { }
