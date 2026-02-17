import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ControlCenterService {
    private readonly logger = new Logger(ControlCenterService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Population Map cluster analysis
     */
    async getPopulationMap() {
        const users = await this.prisma.user.findMany({
            include: {
                assessment: true,
                state: true,
                behaviorState: true,
                completions: true,
                logs: {
                    take: 7,
                    orderBy: { createdAt: 'desc' },
                }
            },
        });

        return users.map(user => {
            const sym = (user.assessment?.symptoms as any) || {};
            // Simplified vectorization for visualization
            const symptomsVector = [
                sym.fatigue ? 1 : 0,
                sym.brainFog ? 1 : 0,
                sym.insomnia ? 1 : 0,
                sym.anxiety ? 1 : 0,
                sym.bloating ? 1 : 0,
            ];

            const adherence = user.completions.length > 0
                ? user.completions.reduce((acc, c) => acc + (c.adherenceRate || 0), 0) / user.completions.length
                : 0;

            return {
                id: user.id,
                organismProfile: {
                    profileType: user.state?.profileType,
                    symptomsVector,
                    energyScore: user.logs[0]?.selfReportEffect ? (user.logs[0].selfReportEffect as any).energy : null,
                },
                effectiveness: adherence,
                currentProtocol: user.state?.programId,
            };
        });
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
}
