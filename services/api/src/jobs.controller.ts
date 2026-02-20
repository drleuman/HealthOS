import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JobScheduler } from './job-scheduler.service';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { RequiredPlan } from './public.decorator';

@Controller('jobs')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequiredPlan('admin')
export class JobsController {
    constructor(
        private scheduler: JobScheduler,
        private jobsService: JobsService,
    ) { }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('trigger/inactivity-check')
    async triggerInactivityCheck() {
        const result = await this.scheduler.triggerInactivityCheck();
        return { ok: true, ...result };
    }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('trigger/weekly-summary')
    async triggerWeeklySummary() {
        const result = await this.scheduler.triggerWeeklySummary();
        return { ok: true, ...result };
    }

    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @Get('results/:userId')
    async getUserJobResults(@Param('userId') userId: string) {
        return this.jobsService.getPendingJobResults(userId);
    }

    @Throttle({ default: { limit: 20, ttl: 60000 } })
    @Post('results/:id/dismiss')
    async dismissJobResult(@Param('id') id: string) {
        await this.jobsService.dismissJobResult(id);
        return { ok: true };
    }
}
