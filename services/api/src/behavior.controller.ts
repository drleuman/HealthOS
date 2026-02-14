import { Controller, Get, Post, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { BehaviorService } from './behavior.service';
import { Public } from './public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('internal/behavior')
export class BehaviorController {
    constructor(private service: BehaviorService) { }

    /**
     * POST /internal/behavior/analyse
     * Manually trigger the behavioral analysis job.
     * Internal/Admin only. Throttled to prevent accidental abuse.
     */
    @Public()
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Post('analyse')
    async triggerAnalysis(
        @Headers('x-analytics-secret') secret: string
    ) {
        const validSecret = process.env.ANALYTICS_SECRET || 'admin-secret-dev';

        if (!secret || secret !== validSecret) {
            throw new UnauthorizedException('Invalid Analytics Secret');
        }

        return this.service.runBehaviorAnalysisJob();
    }

    /**
     * GET /internal/behavior/:userId
     * Retrieve the inferred state and last snapshot for a specific user.
     */
    @Public()
    @Get(':userId')
    async getUserState(
        @Param('userId') userId: string,
        @Headers('x-analytics-secret') secret: string
    ) {
        const validSecret = process.env.ANALYTICS_SECRET || 'admin-secret-dev';

        if (!secret || secret !== validSecret) {
            throw new UnauthorizedException('Invalid Analytics Secret');
        }

        return this.service.getUserState(userId);
    }
}
