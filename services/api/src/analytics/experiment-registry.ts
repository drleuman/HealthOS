import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { logger } from '../logger';

export interface Experiment {
    id: string;
    decisionHash: string;
    startedAt: Date;
    expiresAt: Date;
    status: 'active' | 'completed';
    metadata: any;
}

@Injectable()
export class ExperimentRegistry {
    constructor(private prisma: PrismaService) { }

    /**
     * getActiveExperiment
     * Returns the currently active experiment if any.
     */
    async getActiveExperiment(): Promise<Experiment | null> {
        const prismaAny = this.prisma as any;
        try {
            const active = await prismaAny.experiment.findFirst({
                where: { status: 'active' },
                orderBy: { startedAt: 'desc' }
            });

            if (!active) return null;

            // Check for expiration
            if (new Date() > active.expiresAt) {
                await this.completeExperiment(active.id);
                return null;
            }

            return active as Experiment;
        } catch (e) {
            logger.warn('Experiment table not found or query failed. Run migrations.');
            return null;
        }
    }

    /**
     * startExperiment
     * Locks a new decision as an experiment for 7 days.
     */
    async startExperiment(decision: any, decisionHash: string): Promise<Experiment | null> {
        const prismaAny = this.prisma as any;
        const active = await this.getActiveExperiment();
        if (active) {
            logger.info('Cannot start new experiment: Experiment already active.');
            return active;
        }

        const durationDays = 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        try {
            return await prismaAny.experiment.create({
                data: {
                    decisionHash,
                    status: 'active',
                    expiresAt,
                    metadata: decision
                }
            });
        } catch (e) {
            logger.error('Failed to start experiment. Check migrations.');
            return null;
        }
    }

    /**
     * completeExperiment
     * Marks an experiment as completed.
     */
    async completeExperiment(id: string): Promise<void> {
        const prismaAny = this.prisma as any;
        try {
            await prismaAny.experiment.update({
                where: { id },
                data: { status: 'completed' }
            });
        } catch (e) {
            logger.error(`Failed to complete experiment ${id}`);
        }
    }
}
