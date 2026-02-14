import { Controller, Get, Post, Param } from '@nestjs/common';
import { JobScheduler } from './job-scheduler.service';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
    constructor(
        private scheduler: JobScheduler,
        private jobsService: JobsService,
    ) { }

    @Post('trigger/inactivity-check')
    async triggerInactivityCheck() {
        const result = await this.scheduler.triggerInactivityCheck();
        return { ok: true, ...result };
    }

    @Post('trigger/weekly-summary')
    async triggerWeeklySummary() {
        const result = await this.scheduler.triggerWeeklySummary();
        return { ok: true, ...result };
    }

    @Get('results/:userId')
    async getUserJobResults(@Param('userId') userId: string) {
        return this.jobsService.getPendingJobResults(userId);
    }

    @Post('results/:id/dismiss')
    async dismissJobResult(@Param('id') id: string) {
        await this.jobsService.dismissJobResult(id);
        return { ok: true };
    }
}
