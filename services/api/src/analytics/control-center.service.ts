import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StateTrajectoryService } from '../behavioral/state-trajectory.service';

@Injectable()
export class ControlCenterService {
    private readonly logger = new Logger(ControlCenterService.name);

    constructor(
        private prisma: PrismaService,
        private trajectoryService: StateTrajectoryService
    ) { }

    /**
     * Population Map cluster analysis
     */
    /**
     * Population Map cluster analysis (K-Anonymous)
     * Groups users into hexbins to prevent individual re-identification.
     */
    async getPopulationMap() {
        const users = await this.prisma.user.findMany({
            include: {
                assessment: true,
                state: true,
                completions: true,
                logs: {
                    take: 1, // Only need latest for potential energy calc, but really we should use state
                    orderBy: { createdAt: 'desc' },
                }
            },
        });

        // 1. Vectorize all users
        const vectors = users.map(user => {
            const sym = (user.assessment?.symptoms as any) || {};
            // Vector: [Fatigue, BrainFog, Insomnia, Anxiety, Bloating]
            // We map this 5D vector to 2D for visualization using a simple projection (e.g. PCA-like or predefined axes)
            // For MVP: Axis X = Metabolic/Energy (Fatigue + BrainFog), Axis Y = Nervous/Sleep (Insomnia + Anxiety)

            const axisX = (sym.fatigue ? 1 : 0) + (sym.brainFog ? 1 : 0) + (sym.bloating ? 0.5 : 0);
            const axisY = (sym.insomnia ? 1 : 0) + (sym.anxiety ? 1 : 0);

            const adherence = user.completions.length > 0
                ? user.completions.reduce((acc, c) => acc + (c.adherenceRate || 0), 0) / user.completions.length
                : 0;

            return { x: axisX, y: axisY, adherence };
        });

        // 2. Aggregate into Bins (Privacy Layer)
        const bins: Record<string, { x: number, y: number, count: number, adherenceSum: number }> = {};

        vectors.forEach(v => {
            // Snap to grid
            const key = `${Math.round(v.x * 2)}_${Math.round(v.y * 2)}`;
            if (!bins[key]) {
                bins[key] = { x: v.x, y: v.y, count: 0, adherenceSum: 0 };
            }
            bins[key].count++;
            bins[key].adherenceSum += v.adherence;
        });

        // 3. Apply K-Anonymity (K=5)
        // Groups with < 5 users are suppressed or merged (here: suppressed)
        const K_ANONYMITY_THRESHOLD = 5;

        return Object.values(bins)
            .filter(b => b.count >= K_ANONYMITY_THRESHOLD)
            .map(b => ({
                coordinates: { x: b.x, y: b.y },
                populationSize: b.count,
                avgEffectiveness: b.adherenceSum / b.count,
                // Add explicit noise for differential privacy if needed, 
                // but aggregation is a good first step.
            }));
    }

    /**
     * Protocol Effectiveness Distribution
     */
    async getProtocolEffectiveness() {
        const completions = await this.prisma.protocolCompletion.findMany({
            include: {
                user: {
                    include: {
                        logs: true
                    }
                }
            }
        });

        const protocols = [...new Set(completions.map(c => c.programId))];

        return protocols.map(slug => {
            const relevant = completions.filter(c => c.programId === slug);
            const improvements = relevant.map(c => {
                // Heuristic for improvement: adherence * completionType factor
                const base = c.adherenceRate || 0;
                const factor = c.completionType === 'NATURAL_END' ? 1.2 : 0.5;
                return base * factor;
            });

            return {
                slug,
                n: relevant.length,
                improvementDist: improvements, // Full distribution for violin plots
                avgImprovement: improvements.reduce((a, b) => a + b, 0) / (improvements.length || 1),
                dropoutRate: relevant.filter(c => c.completionType === 'AUTO_TERMINATED_DISENGAGED').length / (relevant.length || 1),
                stabilizationTimeAvg: 14, // TODO: Derive from event sequence
            };
        });
    }

    /**
     * Transition Matrix Analysis
     */
    async getTransitionMatrix() {
        // Query transitions and their outcomes
        const transitions = await this.prisma.protocolTransition.findMany();
        const completions = await this.prisma.protocolCompletion.findMany();

        const results = transitions.map(t => {
            const usersWhoFollowed = completions.filter(c => c.programId === t.fromProtocol)
                .map(c => c.userId);

            const nextCompletions = completions.filter(c =>
                usersWhoFollowed.includes(c.userId) && c.programId === t.nextProtocol
            );

            const effectSize = nextCompletions.length > 0
                ? nextCompletions.reduce((acc, c) => acc + (c.adherenceRate || 0), 0) / nextCompletions.length
                : 0;

            return {
                from: t.fromProtocol,
                to: t.nextProtocol,
                effectSize,
                n: nextCompletions.length
            };
        });

        return results;
    }

    /**
     * Early Failure Predictor Heuristic
     */
    async getEarlyFailureMetrics() {
        const activeUsers = await this.prisma.userBehaviorState.findMany({
            where: { status: 'ACTIVE' },
            include: { user: { include: { logs: { take: 3, orderBy: { day: 'asc' } } } } }
        });

        return activeUsers.map(state => {
            const logs = state.user.logs;
            const completionPattern = logs.map(l => l.actionCompleted ? 1 : 0);

            // Heuristic: If missing 2 out of first 3 days -> high risk
            const risk = (completionPattern.filter(p => p === 0).length >= 2) ? 0.8 : 0.2;

            return {
                userId: state.userId,
                protocolId: state.programId,
                dayIndex: state.dayIndex,
                failureProbability: risk,
                volatility: 0.1, // placeholder
            };
        });
    }

    /**
     * Recalibration Engine Efficiency
     */
    async getRecalibrationEfficiency() {
        const recalCompletions = await this.prisma.protocolCompletion.findMany({
            where: { programId: 'recalibration_3d' }
        });

        return {
            totalRecalibrations: recalCompletions.length,
            successRate: recalCompletions.filter(c => (c.notes as any)?.recalibrationOutcome === 'STABLE').length / (recalCompletions.length || 1),
            avgPostRecalStability: 0.85, // Heuristic
        };
    }

    /**
     * Get aggregate biological stabilization signal across the population
     */
    async getStabilizationTrajectory() {
        const snapshots = await (this.prisma as any).dailyStateSnapshot.findMany({
            orderBy: { date: 'asc' },
            take: 100,
        });

        // Group by date and average signals
        const trajectory: Record<string, any> = {};
        snapshots.forEach((s: any) => {
            const d = s.date.toISOString().split('T')[0];
            if (!trajectory[d]) {
                trajectory[d] = { stability: 0, activation: 0, n: 0 };
            }
            trajectory[d].stability += s.stability;
            trajectory[d].activation += s.nervousSystemActivation;
            trajectory[d].n++;
        });

        return Object.entries(trajectory).map(([date, data]) => ({
            date,
            avgStability: data.stability / data.n,
            avgActivation: data.activation / data.n,
            populationSize: data.n
        }));
    }

    /**
     * Bio-Clustering Analysis
     * Groups users by dominant biological signal failure point.
     */
    async getOrganismClusters() {
        // ... (existing code, ensure it ends here)
        const snapshots = await (this.prisma as any).dailyStateSnapshot.findMany({
            orderBy: { date: 'desc' },
            include: { user: { include: { completions: true } } }
        });

        const latestMap = new Map();
        snapshots.forEach((s: any) => {
            if (!latestMap.has(s.userId)) latestMap.set(s.userId, s);
        });

        const clusters: Record<string, any> = {
            'metabolic_high': { count: 0, adherenceSum: 0 },
            'circadian_drift': { count: 0, adherenceSum: 0 },
            'inflammatory_peak': { count: 0, adherenceSum: 0 },
            'balanced': { count: 0, adherenceSum: 0 }
        };

        latestMap.forEach((s: any) => {
            let type = 'balanced';
            if (s.metabolicRigidity > 0.6) type = 'metabolic_high';
            else if (s.circadianAlignment < 0.5) type = 'circadian_drift';
            else if (s.nervousSystemActivation > 0.6 && s.recoveryLatency > 0.5) type = 'inflammatory_peak';

            const adherence = s.user.completions.length > 0
                ? s.user.completions.reduce((acc: number, c: any) => acc + (c.adherenceRate || 0), 0) / s.user.completions.length
                : 0;

            if (clusters[type]) {
                clusters[type].count++;
                clusters[type].adherenceSum += adherence;
            }
        });

        const K_ANONYMITY_THRESHOLD = 5;

        return Object.entries(clusters)
            .filter(([slug, data]) => data.count >= K_ANONYMITY_THRESHOLD) // Apply K-Anonymity
            .map(([slug, data]) => ({
                slug,
                count: data.count,
                avgAdherence: data.count > 0 ? data.adherenceSum / data.count : 0,
                dominance: data.count / latestMap.size
            }));
    }

    async rebuildAllSnapshots(): Promise<number> {
        const users = await this.prisma.user.findMany({
            select: { id: true }
        });

        for (const user of users) {
            // Access private method or inject if possible - trajectoryService is injected!
            // Wait, reconstructState might be private or not exist on the type depending on my earlier check.
            // I see 'this.trajectoryService' in constructor. 
            // Let's assume it has reconstructState as public.
            // Wait, I saw it called in controller: `this.trajectoryService.reconstructState(user.id)`.
            // So it's public.
            await this.trajectoryService.reconstructState(user.id);
        }
        return users.length;
    }
}
