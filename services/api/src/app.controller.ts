import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BehaviorService } from './behavior.service';
import { SystemMessageService } from './behavioral/system-message.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { Public } from './public.decorator';
import { MetricsService } from './metrics/metrics.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

@Controller()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class AppController {
    constructor(
        private behaviorService: BehaviorService,
        private systemMessageService: SystemMessageService,
        private metricsService: MetricsService,
        private config: ConfigService
    ) { }

    @Public()
    @Get('/health')
    getHealth() {
        return {
            ok: true,
            ts: new Date().toISOString(),
            version: '0.1.0'
        };
    }

    @Public()
    @Get('/ops/sentry-test')
    testSentry() {
        throw new Error('Sentry backend test');
    }

    @Public()
    @Get('/internal/health-check')
    async getInternalHealth(@Req() req: any) {
        const secret = req.headers['x-internal-secret'];
        const configuredSecret = this.config.get('INTERNAL_HEALTH_SECRET') || 'internal_dev_secret';

        if (secret !== configuredSecret) {
            throw new UnauthorizedException('Invalid internal secret');
        }

        const metrics = await this.metricsService.getSystemHealthMetrics();
        return {
            ok: true,
            ts: new Date().toISOString(),
            metrics
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get('/user/history') // Matches frontend api call
    async getHistory(@Req() req: any) {
        return this.behaviorService.getUserHistory(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('/today')
    async getToday(@Req() req: any) {
        // 1. Get User State (DB)
        const userState = await this.behaviorService.getUserState(req.user.id);

        // 2. Build Response (State + Content + Message)
        return this.systemMessageService.buildDailySystemState(userState);
    }
}
