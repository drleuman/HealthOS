import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BehaviorService } from './behavior.service';
import { SystemMessageService } from './behavioral/system-message.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { Public } from './public.decorator';

@Controller()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class AppController {
    constructor(
        private behaviorService: BehaviorService,
        private systemMessageService: SystemMessageService
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
