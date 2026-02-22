import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ExperimentService } from '../analytics/experiment.service';

@Injectable()
export class TrialService {
    private readonly logger = new Logger(TrialService.name);

    constructor(
        private prisma: PrismaService,
        private experimentService: ExperimentService
    ) { }

    /**
     * getTrialDuration
     * Returns trial length in days based on A/B test 'trial_length'
     */
    async getTrialDuration(userId: string): Promise<number> {
        const variant = await this.experimentService.getVariant(userId, 'trial_length');

        switch (variant) {
            case 'v3': return 3;
            case 'v5': return 5;
            case 'control':
            case 'v7':
            default: return 7;
        }
    }

    /**
     * getPaywallThreshold
     * Returns the number of logs required before showing paywall based on 'paywall_trigger'
     */
    async getPaywallThreshold(userId: string): Promise<number> {
        const variant = await this.experimentService.getVariant(userId, 'paywall_trigger');

        switch (variant) {
            case 'v5': return 5;
            case 'v7': return 7;
            case 'control':
            case 'v3':
            default: return 3;
        }
    }

    /**
     * isGated
     * Checks if a user should be gated by the paywall.
     */
    async isGated(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true, trialUntil: true, totalLogs: true }
        });

        if (!user) return true;
        if (user.plan !== 'free') return false; // Already subscribed

        // Check if trial is active
        if (user.trialUntil && new Date() < user.trialUntil) {
            return false;
        }

        // Check if logs threshold reached
        const threshold = await this.getPaywallThreshold(userId);
        if (user.totalLogs < threshold) {
            return false;
        }

        return true;
    }

    /**
     * startTrial
     * Initializes trial for a user.
     */
    async startTrial(userId: string) {
        const duration = await this.getTrialDuration(userId);
        const until = new Date();
        until.setDate(until.getDate() + duration);

        return await this.prisma.user.update({
            where: { id: userId },
            data: {
                trialUntil: until,
                trialStartedAt: new Date()
            }
        });
    }

    /**
     * incrementLogs
     * Tracks usage for paywall trigger and awards retention rewards.
     */
    async incrementLogs(userId: string) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                totalLogs: { increment: 1 }
            }
        });

        // Award streak freeze every 10 logs (milestone)
        if (user.totalLogs > 0 && user.totalLogs % 10 === 0) {
            await this.awardStreakFreeze(userId);
        }

        return user;
    }

    /**
     * awardStreakFreeze
     * Gives the user a one-time streak preservation "life".
     */
    async awardStreakFreeze(userId: string) {
        this.logger.log(`Awarding streak freeze to user ${userId}`);
        return await this.prisma.user.update({
            where: { id: userId },
            data: { streakFreezes: { increment: 1 } }
        });
    }
}
