import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class AbuseIntelligenceService {
    private readonly logger = new Logger(AbuseIntelligenceService.name);

    constructor(
        private prisma: PrismaService,
        private metrics: MetricsService
    ) { }

    async detectAbusePatterns() {
        // 1. Detect IP Clusters (Single IP with unusually high request volume)
        const ipClusters = await this.detectIPClusters();

        // 2. Detect Rate Limit Floods (High volume of throttled requests)
        const floods = await this.detectRateLimitFloods();

        // 3. Detect Token Reuse / Suspicious Auth Patterns
        const authAbuse = await this.detectAuthAbuse();

        return {
            ipClusters,
            floods,
            authAbuse
        };
    }

    private async detectIPClusters() {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // This query requires a 'clientIp' field in events or a similar log
        // Assuming we track 'request' events with IP in meta
        const clusters = await (this.prisma as any).event.groupBy({
            by: ['userId'], // We don't have IP yet, but we have userId
            where: {
                createdAt: { gte: hourAgo }
            },
            _count: {
                _all: true
            },
            having: {
                id: {
                    _count: { gte: 1000 } // More than 1000 requests per hour
                }
            }
        });

        return clusters;
    }

    private async detectRateLimitFloods() {
        // Check for 429 errors in the last 15 minutes
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

        const floodCount = await (this.prisma as any).metricSnapshot.findFirst({
            where: {
                name: 'rate_limited_requests',
                timestamp: { gte: fifteenMinAgo },
                value: { gte: 100 } // Spike in rate limiting
            }
        });

        return floodCount ? true : false;
    }

    private async detectAuthAbuse() {
        // Detect repeat failed logins from same user/ip
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

        const failedLogins = await (this.prisma as any).event.groupBy({
            by: ['userId'],
            where: {
                event: 'login_failed',
                createdAt: { gte: fifteenMinAgo }
            },
            _count: {
                _all: true
            },
            having: {
                id: {
                    _count: { gte: 10 } // 10 failed logins in 15 mins
                }
            }
        });

        return failedLogins;
    }
}
