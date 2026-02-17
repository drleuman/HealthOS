import { Controller, Get, Post, Headers, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { ControlCenterService } from './control-center.service';
import { StateTrajectoryService } from '../behavioral/state-trajectory.service';
import { Public } from '../public.decorator';

@Controller('internal/control-center')
export class ControlCenterController {
    constructor(
        private ccService: ControlCenterService,
        private trajectoryService: StateTrajectoryService
    ) { }

    private validateSecret(secret: string) {
        const validSecret = process.env.ANALYTICS_SECRET || 'admin-secret-dev';
        if (!secret || secret !== validSecret) {
            throw new UnauthorizedException('Invalid Research Secret');
        }
    }

    @Public()
    @Get('population-map')
    async getPopulationMap(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        return this.ccService.getPopulationMap();
    }

    @Public()
    @Get('protocol-effectiveness')
    async getProtocolEffectiveness(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        return this.ccService.getProtocolEffectiveness();
    }

    @Public()
    @Get('transition-matrix')
    async getTransitionMatrix(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        return this.ccService.getTransitionMatrix();
    }

    @Public()
    @Get('early-failure-predictor')
    async getEarlyFailureMetrics(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        return this.ccService.getEarlyFailureMetrics();
    }

    @Public()
    @Get('recalibration-stats')
    async getRecalibrationStats(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        return this.ccService.getRecalibrationEfficiency();
    }

    @Public()
    @Get('stabilization-trajectory')
    async getStabilizationTrajectory(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        return this.ccService.getStabilizationTrajectory();
    }

    @Public()
    @Post('rebuild-snapshots')
    async rebuildSnapshots(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        // This is a heavy operation, we should ideally job-ify it, 
        // but for research override we trigger it directly.
        const count = await this.ccService.rebuildAllSnapshots();
        return { status: 'rebuild_triggered', n: count };
    }

    @Public()
    @Get('organism-clusters')
    async getOrganismClusters(@Headers('x-research-secret') secret: string) {
        this.validateSecret(secret);
        return this.ccService.getOrganismClusters();
    }
}
