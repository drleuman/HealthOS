import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, SetMetadata, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { SubscriptionGuard, REQUIRED_PLAN_KEY } from '../subscription.guard';
import { Throttle } from '@nestjs/throttler';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';

// Custom decorator for assigning required plan natively
export const RequiredPlan = (plan: string) => SetMetadata(REQUIRED_PLAN_KEY, plan);

@Controller('admin')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequiredPlan('admin')
@Throttle({ default: { limit: 300, ttl: 60000 } }) // Admin specific rate limit
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly systemAlerts: SystemAlertsService
    ) { }

    @Get('overview')
    getOverview(@Req() req: any, @Query('period') period: string) {
        const periodDays = period === '30d' ? 30 : (period === '24h' ? 1 : 7);
        return this.adminService.getOverview(req.user.id, periodDays);
    }

    @Get('users')
    getUsers(
        @Query('query') query: string,
        @Query('plan') plan: string,
        @Query('status') status: string,
        @Query('page') page: string,
        @Query('limit') limit: string
    ) {
        const safeLimit = Math.min(parseInt(limit) || 20, 50);
        return this.adminService.getUsers(query, plan, status, parseInt(page) || 1, safeLimit);
    }

    @Get('users/:id')
    getUserDetails(@Param('id') id: string) {
        return this.adminService.getUserDetails(id);
    }

    @Patch('users/:id')
    updateUser(
        @Req() req: any,
        @Param('id') id: string,
        @Body() updateData: { plan?: string; role?: string; status?: string; metadata?: any }
    ) {
        return this.adminService.updateUser(req.user.id, id, updateData);
    }

    @Post('users/:id/revoke-sessions')
    revokeSessions(
        @Req() req: any,
        @Param('id') id: string,
        @Body() body: { sessionId?: string }
    ) {
        return this.adminService.revokeSessions(req.user.id, id, body?.sessionId);
    }

    @Get('users/:id/timeline')
    getUserTimeline(@Param('id') id: string) {
        return this.adminService.getUserActivityTimeline(id);
    }

    @Get('events')
    getEvents(
        @Query('event') event: string,
        @Query('feature') feature: string,
        @Query('userId') userId: string,
        @Query('period') period: string,
        @Query('limit') limit: string
    ) {
        const periodDays = period === '30d' ? 30 : (period === '24h' ? 1 : 7);
        const safeLimit = Math.min(parseInt(limit) || 200, 5000);
        return this.adminService.getEvents(event, feature, userId, periodDays, safeLimit);
    }

    @Get('system/health')
    getSystemHealth() {
        return this.adminService.getSystemHealth();
    }

    @Get('alerts/overview')
    getAlertsOverview() {
        return this.systemAlerts.getOverview();
    }

    @Get('alerts')
    getAlerts(
        @Query('period') period: string,
        @Query('severity') severity: string,
        @Query('type') type: string,
        @Query('limit') limit: string
    ) {
        const periodDays = period === '30d' ? 30 : (period === '24h' ? 1 : 7);
        const safeLimit = Math.min(parseInt(limit) || 50, 200);
        return this.systemAlerts.getAlerts(periodDays, severity, type, safeLimit);
    }

    @Get('insights')
    getInsights(@Query('period') period: string) {
        const periodDays = period === '30d' ? 30 : (period === '24h' ? 1 : 7);
        return this.adminService.getInsights(periodDays);
    }

    @Get('growth')
    getGrowth(@Query('period') period: string) {
        const periodDays = period === '30d' ? 30 : (period === '24h' ? 1 : 7);
        return this.adminService.getGrowthMetrics(periodDays);
    }

    @Get('experiments')
    getExperiments() {
        return this.adminService.getExperiments();
    }

    @Get('experiments/:key')
    getExperimentResult(@Param('key') key: string) {
        return this.adminService.getExperimentResult(key);
    }
}
