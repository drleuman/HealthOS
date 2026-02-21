import { Module } from '@nestjs/common';
import { SystemAlertsService } from './system-alerts.service';
import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [SystemAlertsService, TelegramService, PrismaService],
    exports: [SystemAlertsService],
})
export class SystemAlertsModule { }
