import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class ExperimentService {
    private readonly logger = new Logger(ExperimentService.name);
    private activeExperimentsCache: any[] | null = null;
    private cacheExpiry: number = 0;

    constructor(private prisma: PrismaService) { }

    /**
     * getVariant
     * Main entry point to get or assign a variant for a user.
     */
    async getVariant(userId: string, experimentKey: string): Promise<string> {
        // 1. Find the experiment (using cache if available)
        const experiments = await this.getCachedExperiments();
        const experiment = experiments.find((e: any) => e.key === experimentKey);

        if (!experiment || experiment.status !== 'active') {
            return 'control';
        }

        // 2. Check for existing assignment
        const existing = await (this.prisma as any).experimentAssignment.findFirst({
            where: {
                userId,
                experimentId: experiment.id
            }
        });

        if (existing) return existing.variant;

        // 3. Assign new variant
        return this.assignVariant(userId, experiment);
    }

    /**
     * assignVariant
     * Deterministically assigns a variant based on userId and experimentKey hash.
     */
    private async assignVariant(userId: string, experiment: any): Promise<string> {
        const variantsConfig = experiment.variants as Record<string, number>; // e.g. { "A": 50, "B": 50 }
        const variantKeys = Object.keys(variantsConfig);

        const salt = 'healthos_exp_salt_v2';
        const input = `${userId}:${experiment.key}:${salt}`;

        const hash = createHash('sha256').update(input).digest('hex');
        const hashInt = parseInt(hash.substring(0, 8), 16);
        const score = hashInt % 100;

        let cumulative = 0;
        let selectedVariant = variantKeys[0];

        for (const key of variantKeys) {
            cumulative += variantsConfig[key];
            if (score < cumulative) {
                selectedVariant = key;
                break;
            }
        }

        // Persist assignment
        try {
            await (this.prisma as any).experimentAssignment.create({
                data: {
                    userId,
                    experimentId: experiment.id,
                    variant: selectedVariant
                }
            });
            this.logger.log(`Assigned variant ${selectedVariant} to user ${userId} for experiment ${experiment.key}`);
        } catch (e) {
            this.logger.error(`Failed to persist assignment for ${userId}`, e);
        }

        return selectedVariant;
    }

    /**
     * trackExposure
     * Logs that a user has seen the experiment variant.
     * Can be used to trigger events or increment counters.
     */
    async trackExposure(userId: string, experimentKey: string) {
        const variant = await this.getVariant(userId, experimentKey);
        // This could mirror to PostHog or internal logs
        this.logger.log(`Exposure: User ${userId} saw ${variant} for ${experimentKey}`);
        return variant;
    }

    async createExperiment(config: any) {
        return await (this.prisma as any).experiment.create({
            data: {
                id: config.id,
                key: config.key,
                description: config.description,
                status: config.status || 'active',
                variants: config.variants || { "control": 50, "treatment": 50 }
            }
        });
    }

    /**
     * getActiveExperiments
     * List all experiments for Admin panel.
     */
    async getActiveExperiments() {
        if (this.activeExperimentsCache && Date.now() < this.cacheExpiry) {
            return this.activeExperimentsCache;
        }

        const experiments = await (this.prisma as any).experiment.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { assignments: true }
                }
            }
        });

        this.activeExperimentsCache = experiments;
        this.cacheExpiry = Date.now() + 5 * 60 * 1000; // 5 min cache
        return experiments;
    }

    private async getCachedExperiments() {
        if (this.activeExperimentsCache && Date.now() < this.cacheExpiry) {
            return this.activeExperimentsCache;
        }
        return this.getActiveExperiments();
    }

    /**
     * getExperimentResult
     * Calculates conversion rate per variant for a specific experiment.
     */
    async getExperimentResult(experimentKey: string) {
        const experiment = await (this.prisma as any).experiment.findUnique({
            where: { key: experimentKey },
            include: { assignments: true }
        });

        if (!experiment) return null;

        const variants = Object.keys(experiment.variants as any);
        const results = [];

        for (const variant of variants) {
            const assignedUsers = experiment.assignments
                .filter((a: any) => a.variant === variant && a.userId)
                .map((a: any) => a.userId);

            const conversions = await (this.prisma as any).event.count({
                where: {
                    userId: { in: assignedUsers },
                    event: 'conversion_completed'
                }
            });

            results.push({
                variant,
                assignments: assignedUsers.length,
                conversions,
                conversionRate: assignedUsers.length > 0 ? (conversions / assignedUsers.length) * 100 : 0
            });
        }

        return {
            key: experiment.key,
            results
        };
    }
}
