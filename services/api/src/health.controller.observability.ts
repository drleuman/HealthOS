import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Public, SkipThrottle } from './public.decorator';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics/metrics.service';
import { Request } from 'express';

@Controller()
export class HealthController {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private metricsService: MetricsService
    ) { }

    @Public()
    @SkipThrottle()
    @Get('health')
    async health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '0.1.0'
        };
    }

    @Public()
    @SkipThrottle()
    @Get('ready')
    async ready() {
        try {
            // Check database connectivity
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                status: 'ready',
                database: 'connected',
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                status: 'not_ready',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
            };
        }
    }

    @Public()
    @SkipThrottle()
    @Get('metrics')
    async metrics(@Req() req: Request) {
        this.validateSecret(req.headers);
        const mem = process.memoryUsage();
        const systemMetrics = await this.metricsService.getSystemHealthMetrics();
        return {
            ...systemMetrics,
            uptime_seconds: process.uptime(),
            memory_heap_used_bytes: mem.heapUsed,
            memory_heap_total_bytes: mem.heapTotal,
            memory_rss_bytes: mem.rss,
            memory_external_bytes: mem.external,
            timestamp: new Date().toISOString(),
        };
    }

    @Public()
    @SkipThrottle()
    @Get('internal/health-check')
    async internalHealthCheck(@Req() req: Request) {
        return this.metrics(req);
    }

    private validateSecret(headers: any) {
        const secret = headers['x-internal-health-secret'] || headers['x-internal-secret'];
        const configuredSecret = this.config.get('X_INTERNAL_SECRET') || this.config.get('INTERNAL_HEALTH_SECRET') || 'dev_secret';

        if (!secret || secret !== configuredSecret) {
            throw new UnauthorizedException('Invalid internal secret');
        }
    }
}

