import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { BehaviorService } from './behavior.service';
import { SystemMessageService } from './behavioral/system-message.service';
import { MetricsService } from './metrics/metrics.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { Public } from './public.decorator';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TrialService } from './behavioral/trial.service';

@Controller()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class AppController {
    constructor(
        private behaviorService: BehaviorService,
        private systemMessageService: SystemMessageService,
        private metrics: MetricsService,
        private config: ConfigService,
        private trialService: TrialService
    ) { }

    @Public()
    @Get('/ops/sentry-test')
    testSentry() {
        throw new Error('Sentry backend test');
    }

    @UseGuards(JwtAuthGuard)
    @Get('/user/history') // Matches frontend api call
    async getHistory(@Req() req: any) {
        return this.behaviorService.getUserHistory(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('/user/trial/start')
    async startTrial(@Req() req: any) {
        return this.trialService.startTrial(req.user.id);
    }
}
