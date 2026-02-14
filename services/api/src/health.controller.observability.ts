import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SkipThrottle } from './public.decorator';

@Controller()
export class HealthController {
    constructor(private prisma: PrismaService) { }

    @SkipThrottle()
    @Get('health')
    async health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };
    }

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

    @SkipThrottle()
    @Get('metrics')
    async metrics() {
        const mem = process.memoryUsage();
        return {
            uptime_seconds: process.uptime(),
            memory_heap_used_bytes: mem.heapUsed,
            memory_heap_total_bytes: mem.heapTotal,
            memory_rss_bytes: mem.rss,
            memory_external_bytes: mem.external,
            timestamp: new Date().toISOString(),
        };
    }
}
