import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PerceptionOutput } from './perception.interpreter';
import { BehaviorContextV1, DeviationState, DeviationType } from './types/behavior-context';

const toIso = () => new Date().toISOString();
function isoAfterDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}
function isIsoPast(iso?: string) {
    if (!iso) return true;
    return new Date(iso).getTime() <= Date.now();
}

@Injectable()
export class StateEngine {
    private readonly logger = new Logger(StateEngine.name);

    constructor(private prisma: PrismaService) { }

    async updateState(userId: string, analysis: PerceptionOutput, rawContext: any, metrics: any) {
        this.logger.log(`Updating state for user ${userId} -> Phase: ${analysis.phaseProgress}`);

        // 1. Fetch current state
        const currentState = await this.prisma.userBehaviorState.findUnique({
            where: { userId }
        });

        // 2. Compute new state values
        const newPhase = analysis.phaseProgress; // The Interpreter is the source of truth for Phase
        const newCognitiveState = analysis.cognitiveState;

        // 3. Update Context (rolling metrics)
        const ctx: BehaviorContextV1 = {
            version: 1,
            ...((currentState?.context as any) || {})
        };

        const now = toIso();
        ctx.lastUpdate = now;
        ctx.lastSignal = analysis.signal;

        ctx.consecutiveFailures = analysis.signal === 'cognitive_confusion' || analysis.signal === 'logistical_block'
            ? (ctx.consecutiveFailures || 0) + 1
            : 0;

        ctx.consecutiveSuccess = analysis.signal === 'consistent_execution'
            ? (ctx.consecutiveSuccess || 0) + 1
            : 0;

        // 3.1. Handle Deviation (Flag)
        if (analysis.deviation) {
            const incoming = analysis.deviation;
            const incomingDeviation: DeviationState = {
                type: incoming.type as DeviationType,
                severity: incoming.severity,
                active: true,
                triggeredAt: incoming.at || now,
                lastEvaluatedAt: now,
                ruleId: incoming.ruleId,
                evidence: incoming.evidence,
                evalCount: 1
            };

            // If already active and same type, preserve triggeredAt and increment evalCount
            if (ctx.deviation?.active && ctx.deviation.type === incomingDeviation.type) {
                incomingDeviation.triggeredAt = ctx.deviation.triggeredAt;
                incomingDeviation.evalCount = (ctx.deviation.evalCount || 0) + 1;
            }
            ctx.deviation = incomingDeviation;
        } else if (ctx.deviation?.active) {
            // Hysteresis: Only clear DRIFT if we have 2 consecutive non-worse (same or better)
            const effects = metrics?.checkEffectHistory || [];
            const last2 = effects.slice(0, 2);
            const isClearable = last2.length === 2 && last2.every((x: any) => x !== 'worse') && (metrics.gapHours || 0) < 168;

            if (isClearable) {
                ctx.deviation = {
                    ...ctx.deviation,
                    active: false,
                    clearedAt: now,
                    lastEvaluatedAt: now,
                    ruleId: 'DEV_CLEAR_HYSTERESIS_2NONWORSE'
                };
            } else {
                ctx.deviation = {
                    ...ctx.deviation,
                    evalCount: (ctx.deviation.evalCount || 0) + 1,
                    lastEvaluatedAt: now
                };
            }
        }

        // 3.2. Handle Re-entry (Proposal) with Cooldown
        const isCompleted = (currentState as any)?.status === 'COMPLETED';
        const deviationActive = !!ctx.deviation?.active;

        if (isCompleted && deviationActive) {
            const cooldownPast = !ctx.reentry?.cooldownUntil || isIsoPast(ctx.reentry.cooldownUntil);

            if (cooldownPast) {
                ctx.reentry = {
                    ...(ctx.reentry || {}),
                    suggestedAt: now,
                    cooldownUntil: isoAfterDays(14),
                    lastSuggestionRuleId: `REENTRY_FROM_${ctx.deviation!.type}`,
                    suggestionCount: (ctx.reentry?.suggestionCount || 0) + 1
                };
            }
        }

        const newContext = ctx;

        // 4. Persist State
        const userState = await this.prisma.userState.findUnique({ where: { userId } });

        await this.prisma.userBehaviorState.upsert({
            where: { userId },
            update: {
                currentPhase: newPhase,
                cognitiveState: newCognitiveState,
                context: newContext,
                state: analysis.recommendedResponse,
                programId: userState?.programId || 'unknown',
                dayIndex: userState?.currentDay || 1
            } as any,
            create: {
                userId,
                state: analysis.recommendedResponse,
                currentPhase: newPhase,
                cognitiveState: newCognitiveState,
                context: newContext,
                programId: userState?.programId || 'unknown',
                dayIndex: userState?.currentDay || 1
            } as any
        });

        return {
            newPhase,
            newCognitiveState,
            systemMode: analysis.recommendedResponse
        };
    }
}
