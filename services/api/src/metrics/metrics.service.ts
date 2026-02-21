import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MetricsService {
    private readonly logger = new Logger(MetricsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get system health metrics for the dashboard
     */
    async getSystemHealthMetrics() {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Count errors in last hour from SystemAlerts or Logs
        // For now, let's use SystemAlerts table as a proxy for 'real' issues
        const [criticalAlerts, totalAlerts] = await Promise.all([
            (this.prisma as any).systemAlert.count({
                where: { severity: 'critical', createdAt: { gte: hourAgo } }
            }),
            (this.prisma as any).systemAlert.count({
                where: { createdAt: { gte: hourAgo } }
            })
        ]);

        return {
            errorsLastHour: totalAlerts,
            criticalLastHour: criticalAlerts,
            status: criticalAlerts > 5 ? 'at_risk' : (criticalAlerts > 0 ? 'degraded' : 'healthy'),
            uptime: Math.floor(process.uptime())
        };
    }
}
