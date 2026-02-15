import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface PerceptionInput {
    userId: string;
    day: number;
    actionStatus: 'completed' | 'failed' | 'partial' | 'skipped' | 'no_activity';
    feedback?: 'worse' | 'same' | 'better' | null;
    timestamp: Date;
    metrics: { // UIG Inputs
        consecutiveCompletions: number;
        consecutiveFailures: number;
        consecutiveMisses: number;
        stagnationDays: number; // consecutive 'same' checks
        gapHours: number;
        timeToLogMinutes?: number;
        checkEffectHistory: string[]; // e.g. ['same', 'worse', 'same']
        navigationFlags?: { historyViewed: boolean, detailsExpanded: boolean };
    };
    context?: any;
}

export interface PerceptionOutput {
    signal: string;          // BIL
    cognitiveState: string;  // BIL
    phaseProgress: string;   // BIL
    recommendedResponse: string; // BIL
    protocolAction: 'advance' | 'repeat' | 'simplify'; // New for Protocol Engine
}

import { resolvePhase, PhaseState, Phase } from './protocol-phase.engine';
import { decideProgress, ProgressDecision } from './day-progression.engine';

@Injectable()
export class PerceptionInterpreter {
    private readonly logger = new Logger(PerceptionInterpreter.name);



    async interpret(input: PerceptionInput): Promise<PerceptionOutput> {
        this.logger.log(`Interpreting input for user ${input.userId}: ${input.actionStatus}`);

        // 1. Detect Behavioral Signal (The "Meaning")
        const signal = this.detectSignal(input);

        // 2. Infer Cognitive State (The "Mindset")
        const cognitiveState = this.inferCognitiveState(signal, input);

        // 3. Determine Phase Progress (Biological) using ProtocolPhaseEngine
        // Need to calculate metrics for PhaseState
        const adherence = this.calculateAdherence(input.metrics);
        const perceptionTrend = this.calculatePerceptionTrend(input.metrics.checkEffectHistory);

        const currentPhase = (input.context?.currentPhase || 'detection') as Phase;

        const phaseState: PhaseState = {
            phase: currentPhase,
            day: input.day,
            adherence,
            perceptionTrend,
            failures: input.metrics.consecutiveFailures
        };

        const phaseProgress = resolvePhase(phaseState);

        // 4. Decide Protocol Action (Advance/Repeat/Simplify) using DayProgressionEngine
        // Map input feedback to "better" | "same" | "worse"
        const perception = (input.feedback === 'better' || input.feedback === 'same' || input.feedback === 'worse')
            ? input.feedback
            : undefined;

        const protocolAction = decideProgress(adherence, input.metrics.consecutiveFailures, perception);

        // 5. Decide System Response (The "Speech Act")
        const responseType = this.decideResponse(signal, cognitiveState, protocolAction);

        return {
            signal,
            cognitiveState,
            phaseProgress,
            recommendedResponse: responseType,
            protocolAction
        };
    }

    private calculateAdherence(metrics: PerceptionInput['metrics']): number {
        // Simplified adherence calc: completions / (completions + misses + failures) * 100
        // Or strictly based on recent history if available.
        // For MVP, using a proxy based on consecutive completions vs failures.

        // TODO: This should ideally look at the last 3 days of logs.
        // For now, estimating:
        if (metrics.consecutiveCompletions >= 3) return 100;
        if (metrics.consecutiveCompletions >= 1) return 80;
        if (metrics.consecutiveFailures > 0 || metrics.consecutiveMisses > 0) return 30;
        return 50;
    }

    private calculatePerceptionTrend(history: string[]): number {
        if (!history || history.length === 0) return 0;
        // Simple distinct trend
        const last = history[0]; // Assuming 0 is most recent? Need validation. 
        // Let's assume passed in order [recent, old] or [old, recent]. 
        // Standard convention usually [newest, oldest] for logs, or [oldest, newest] for time series.
        // Given earlier snippets, let's treat it as a list of recent values.

        let score = 0;
        history.slice(0, 3).forEach(h => {
            if (h === 'better') score += 1;
            if (h === 'worse') score -= 1;
        });

        return score > 0 ? 1 : (score < 0 ? -1 : 0);
    }

    private detectSignal(input: PerceptionInput): string {
        const { metrics, actionStatus, feedback } = input;

        // --- ADHERENCE SIGNALS ---
        if (actionStatus === 'completed') {
            if (metrics.consecutiveCompletions >= 2) return 'consistent_execution';

            // "time_to_log" high (e.g. > 12h late)
            const isLate = (metrics.timeToLogMinutes || 0) > 720;
            if (isLate) return 'effortful_execution';

            // Mechanical: Always 'same' for 4+ days
            if (metrics.stagnationDays >= 4 && feedback === 'same') return 'mechanical_execution';

            return 'consistent_execution'; // Default
        }

        if (actionStatus === 'partial') {
            return 'effortful_execution';
        }

        // --- FRICTION SIGNALS ---
        if (actionStatus === 'failed' || actionStatus === 'skipped') {
            // Cognitive Confusion: Failed but tried to understand (viewed details)
            if (metrics.navigationFlags?.detailsExpanded) return 'cognitive_confusion';

            // Logistical: Failed but gap is small (tried to do it)
            if (metrics.gapHours < 24) return 'logistical_block';

            return 'logistical_block'; // Default failure
        }

        if (actionStatus === 'no_activity') {
            if (metrics.gapHours >= 48) return 'avoidance_pattern';
            if (metrics.navigationFlags?.historyViewed) return 'reflective_engagement'; // Visited but didn't act
            return 'passive_presence';
        }

        // --- PHYSIOLOGICAL SIGNALS (Feedback Driven) ---
        if (feedback === 'better') return 'positive_shift';

        if (feedback === 'worse') {
            if (actionStatus === 'completed' || actionStatus === 'partial') return 'adaptation_response'; // "Good pain"
            // If failed + worse + consecutive failures -> Overload
            if (metrics.consecutiveFailures >= 2) return 'overload_response';
        }

        if (feedback === 'same' && metrics.stagnationDays >= 3) return 'null_response';

        return 'null_response';
    }

    private inferCognitiveState(signal: string, input: PerceptionInput): string {
        const { metrics, feedback } = input;

        // PRIORITY 1: CRITICAL STATES

        // Overwhelmed: 2+ failures OR Overload response OR (2+ misses & gap < 72h)
        if (metrics.consecutiveFailures >= 2) return 'overwhelmed';
        if (signal === 'overload_response') return 'overwhelmed';
        if (metrics.consecutiveMisses >= 2 && metrics.gapHours < 72) return 'overwhelmed';

        // Discouraged: Null response (same) for 5+ days OR (Completed but same/worse for 4 days)
        if (signal === 'null_response' && metrics.stagnationDays >= 5) return 'discouraged';

        // Resistant: Skipped 3+ times recent + No navigation
        // (Simplified check for MVP)
        if (input.actionStatus === 'skipped' && metrics.consecutiveFailures >= 3) return 'resistant';

        // PRIORITY 2: OPERATIONAL STATES

        // Uncertain: Adaptation response OR Repeated reassurance checks (not tracked yet)
        if (signal === 'adaptation_response') return 'uncertain';
        if (signal === 'effortful_execution') return 'uncertain';

        // Oriented: Completed + Checked history + No misses
        if (input.actionStatus === 'completed' && metrics.consecutiveMisses === 0) return 'oriented';

        // Stabilized: 4+ completions + Positive shift at least once (simplified)
        if (metrics.consecutiveCompletions >= 4) return 'stabilized';

        // Compensating: Over execution (not fully tracked yet) -> Default to Oriented for now

        return 'oriented'; // Fallback
    }



    private decideResponse(signal: string, cognitiveState: string, action: 'advance' | 'repeat' | 'simplify'): string {
        // Mapear a SYSTEM RESPONSE TYPE (capa 5)

        if (action === 'simplify') return 'simplification';

        if (cognitiveState === 'overwhelmed') return 'simplification';
        if (cognitiveState === 'discouraged') return 'normalization';
        if (cognitiveState === 'resistant') return 'containment';

        if (cognitiveState === 'uncertain') {
            // If signal is adaptation (worse feel), normalize it. Else orient.
            return signal === 'adaptation_response' ? 'normalization' : 'orientation';
        }

        if (cognitiveState === 'oriented') return 'reinforcement';
        if (cognitiveState === 'stabilized') return 'transition';

        // Default based on action
        if (action === 'advance') return 'reinforcement';

        return 'orientation';
    }
}
