import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TelegramService } from './telegram.service';

@Injectable()
export class SystemAlertsService {
    private readonly logger = new Logger(SystemAlertsService.name);

    // In-memory rate limiting counters
    private errorSpikeCount = 0;
    private rateLimitSpikeCount = 0;
    private lastResetTime = Date.now();
    private lastAlertNotifications = new Map<string, number>();

    constructor(
        private prisma: PrismaService,
        private telegram: TelegramService
    ) {
        // Reset counters every minute
        setInterval(() => {
            this.errorSpikeCount = 0;
            this.rateLimitSpikeCount = 0;
            this.lastResetTime = Date.now();
        }, 60000);
    }

    async triggerAlert(
        type: string,
        severity: 'info' | 'warn' | 'critical',
        message: string,
        meta: any = {}
    ) {
        this.logger.warn(`Triggering System Alert: [${severity.toUpperCase()}] ${type} - ${message}`);

        // Persist to DB
        const alert = await (this.prisma as any).systemAlert.create({
            data: {
                type,
                severity,
                message,
                meta: meta ? JSON.parse(JSON.stringify(meta)) : {}
            }
        });

        // Notify if critical (with 2-minute deduplication per type)
        if (severity === 'critical') {
            const now = Date.now();
            const lastSent = this.lastAlertNotifications.get(type) || 0;
            const twoMinutes = 2 * 60 * 1000;

            if (now - lastSent > twoMinutes) {
                this.lastAlertNotifications.set(type, now);
                await this.telegram.notifyCriticalAlert(type, message, meta);
            } else {
                this.logger.log(`Skipping Telegram notification for ${type} (deduplicated)`);
            }
        }

        return alert;
    }

    // --- Utility Hooks for Middleware / Filters ---

    async register5xxError(route: string, message: string) {
        this.errorSpikeCount++;
        if (this.errorSpikeCount > 20) { // arbitrary MVP threshold: 20 errors/min
            // Debounce trigger: only trigger once per minute burst
            if (this.errorSpikeCount === 21) {
                await this.triggerAlert('api_5xx_spike', 'critical', 'More than 20 5xx errors detected in the last minute.', { route, message });
            }
        }
    }

    async registerRateLimitExceeded(ip: string) {
        this.rateLimitSpikeCount++;
        if (this.rateLimitSpikeCount > 50) { // MVP threshold: 50 blocks/min
            if (this.rateLimitSpikeCount === 51) {
                await this.triggerAlert('rate_limit_spike', 'warn', 'Rate limit spikes detected globally.', { lastBlockedIp: ip });
            }
        }
    }

    // --- Admin Endpoints ---

    async getAlerts(periodDays: number, severity?: string, type?: string, limit: number = 50) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - periodDays);

        const where: any = { createdAt: { gte: dateLimit } };
        if (severity) where.severity = severity;
        if (type) where.type = type;

        return (this.prisma as any).systemAlert.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getOverview() {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 1); // last 24h MVP

        const count = await (this.prisma as any).systemAlert.count({
            where: {
                createdAt: { gte: dateLimit },
                severity: 'critical'
            }
        });

        return { criticalAlerts24h: count };
    }
}
