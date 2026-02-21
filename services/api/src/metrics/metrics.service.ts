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
            requestsCurrentMinute: bucket?.requests || 0,
            errorsLastHour: totalAlerts,
            criticalLastHour: criticalAlerts,
            status: criticalAlerts > 5 ? 'at_risk' : (criticalAlerts > 0 ? 'degraded' : 'healthy'),
            uptime: Math.floor(process.uptime())
        };
    }
}
