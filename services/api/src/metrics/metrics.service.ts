import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface MetricBucket {
    requests: number;
    errors5xx: number;
    errors4xx: number;
    logins: number;
    loginFailures: number;
    rateLimitHits: number;
    tokenReuse: number;
    paywallHits: number;
    conversions: number;
    latencies: number[];
}

@Injectable()
export class MetricsService implements OnModuleInit {
    private readonly logger = new Logger(MetricsService.name);
    private buckets = new Map<string, MetricBucket>();

    constructor(private prisma: PrismaService) { }

    onModuleInit() {
        // Flush metrics every 60s
        setInterval(() => this.flushBuckets(), 60000);
    }

    private getBucketKey(date: Date = new Date()): string {
        return date.toISOString().substring(0, 16); // "YYYY-MM-DDTHH:mm"
    }

    private getOrCreateBucket(key: string): MetricBucket {
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = {
                requests: 0,
                errors5xx: 0,
                errors4xx: 0,
                logins: 0,
                loginFailures: 0,
                rateLimitHits: 0,
                tokenReuse: 0,
                paywallHits: 0,
                conversions: 0,
                latencies: []
            };
            this.buckets.set(key, bucket);
        }
        return bucket;
    }

    recordRequest(status: number, latencyMs: number) {
        const bucket = this.getOrCreateBucket(this.getBucketKey());
        bucket.requests++;
        bucket.latencies.push(latencyMs);
        if (status >= 500) bucket.errors5xx++;
        else if (status >= 400) bucket.errors4xx++;
    }

    recordLogin(success: boolean) {
        const bucket = this.getOrCreateBucket(this.getBucketKey());
        if (success) bucket.logins++;
        else bucket.loginFailures++;
    }

    recordRateLimit() {
        const bucket = this.getOrCreateBucket(this.getBucketKey());
        bucket.rateLimitHits++;
    }

    recordTokenReuse() {
        const bucket = this.getOrCreateBucket(this.getBucketKey());
        bucket.tokenReuse++;
    }

    recordPaywallHit() {
        const bucket = this.getOrCreateBucket(this.getBucketKey());
        bucket.paywallHits++;
    }

    recordConversion() {
        const bucket = this.getOrCreateBucket(this.getBucketKey());
        bucket.conversions++;
    }

    async flushBuckets() {
        const nowKey = this.getBucketKey();
        const keysToFlush = Array.from(this.buckets.keys()).filter(k => k < nowKey);

        for (const key of keysToFlush) {
            const bucket = this.buckets.get(key);
            if (!bucket) continue;

            const avgLatency = bucket.latencies.length > 0
                ? bucket.latencies.reduce((a, b) => a + b, 0) / bucket.latencies.length
                : 0;

            const p95Latency = bucket.latencies.length > 0
                ? bucket.latencies.sort((a, b) => a - b)[Math.floor(bucket.latencies.length * 0.95)]
                : 0;

            const metrics = [
                { name: 'requests_per_min', value: bucket.requests },
                { name: 'errors_5xx_per_min', value: bucket.errors5xx },
                { name: 'errors_4xx_per_min', value: bucket.errors4xx },
                { name: 'login_success_per_min', value: bucket.logins },
                { name: 'login_failure_per_min', value: bucket.loginFailures },
                { name: 'rate_limit_hits_per_min', value: bucket.rateLimitHits },
                { name: 'token_reuse_detected_per_min', value: bucket.tokenReuse },
                { name: 'paywall_hits_per_min', value: bucket.paywallHits },
                { name: 'conversions_per_min', value: bucket.conversions },
                { name: 'api_latency_avg', value: avgLatency },
                { name: 'api_latency_p95', value: p95Latency }
            ];
            try {
                await (this.prisma as any).metricSnapshot.createMany({
                    data: metrics.map(m => ({
                        name: m.name,
                        value: m.value,
                        window: '1m',
                        createdAt: new Date(key + ':00Z')
                    }))
                });
                this.buckets.delete(key);
            } catch (e: any) {
                this.logger.error(`Failed to flush metrics for ${key}: ${e.message}`);
            }
        }
    }

    /**
     * Get system health metrics for the dashboard
     */
    async getSystemHealthMetrics() {
        const currentKey = this.getBucketKey();
        const bucket = this.buckets.get(currentKey);

        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

        let criticalAlerts = 0;
        let totalAlerts = 0;
        let lastHourMetrics: any[] = [];
        let criticalLastHour = 0;

        try {
            // Count errors in last hour from SystemAlerts or Logs
            // For now, let's use SystemAlerts table as a proxy for 'real' issues
            const [crit, tot, snapshots, critHour] = await Promise.all([
                (this.prisma as any).systemAlert.count({
                    where: { severity: 'critical', createdAt: { gte: hourAgo } }
                }),
                (this.prisma as any).systemAlert.count({
                    where: { createdAt: { gte: hourAgo } }
                }),
                (this.prisma as any).metricSnapshot.findMany({
                    where: {
                        createdAt: { gte: hourAgo },
                        window: '1m'
                    },
                    select: {
                        name: true,
                        value: true
                    }
                }),
                (this.prisma as any).systemAlert.count({
                    where: {
                        severity: 'critical',
                        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
                    }
                })
            ]);
            criticalAlerts = crit;
            totalAlerts = tot;
            lastHourMetrics = snapshots;
            criticalLastHour = critHour;
        } catch (e: any) {
            this.logger.error(`Database query failed in getSystemHealthMetrics (limited mode): ${e.message}`);
        }

        const aggregatedLastHour = lastHourMetrics.reduce((acc: any, metric: any) => {
            acc[metric.name] = (acc[metric.name] || 0) + metric.value;
            return acc;
        }, {} as Record<string, number>);

        const current = {
            requests: bucket?.requests || 0,
            errors5xx: bucket?.errors5xx || 0,
            paywallHits: bucket?.paywallHits || 0,
            logins: bucket?.logins || 0,
        };

        const last60 = {
            requests: aggregatedLastHour['requests_per_min'] || 0,
            errors5xx: aggregatedLastHour['errors_5xx_per_min'] || 0,
            paywallHits: aggregatedLastHour['paywall_hits_per_min'] || 0,
            conversions: aggregatedLastHour['conversions_per_min'] || 0,
            logins: aggregatedLastHour['login_success_per_min'] || 0,
        };

        return {
            status: this.getAggregatedStatus(current),
            uptime: process.uptime(),
            requestsCurrentMinute: current.requests,
            errorsLastHour: last60.errors5xx,
            paywallHitsLastHour: last60.paywallHits,
            conversionsLastHour: last60.conversions,
            criticalLastHour: criticalLastHour
        };
    }

    private getAggregatedStatus(currentMetrics: { requests: number; errors5xx: number; paywallHits: number; logins: number }): 'healthy' | 'degraded' | 'at_risk' {
        if (currentMetrics.errors5xx > 0) {
            return 'degraded';
        }
        // Add more complex logic here based on other metrics if needed
        return 'healthy';
    }
}
