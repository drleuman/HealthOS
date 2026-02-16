import { Injectable, Logger } from '@nestjs/common';

export type MessageType =
    | "ORIENTATION"
    | "NORMALIZATION"
    | "SIMPLIFICATION"
    | "RE_ENGAGEMENT"
    | "CLOSURE"
    | "TRANSITION"
    | "MINIMAL_MODE_ON"
    | "MINIMAL_MODE_OFF";

export type MessageInput = {
    protocolId: string;
    day: number;
    phaseId: string;
    adherence7d: number;           // 0..1
    consecutiveFailures: number;
    inactivityHours: number;
    frictionScore: number;         // 0..100
    lastCheckOptionId?: string;    // e.g. "worse"
    minimalModeLevel: 0 | 1 | 2;
    protocolStatus?: string;       // e.g. "ACTIVE", "COMPLETED"
    completionType?: string;       // e.g. "NATURAL_END", "USER_ENDED"
    isSpontaneousReturn?: boolean;
    deviationType?: 'DRIFT' | 'LATENT_INSTABILITY' | 'CRITICAL_DISCONNECT' | null;
    canSuggestReentry?: boolean;
};

export type GeneratedMessage = {
    type: string;
    tone: "neutral" | "technical" | "supportive-neutral";
    key: string;                   // i18n key
    selectedRuleId?: string;       // Audit
    minimalModeLevel: number;      // Mode state
    reason: Record<string, any>;   // Input snapshot for audit
    params?: Record<string, any>;
};

@Injectable()
export class MessageGenerationService {
    private readonly logger = new Logger(MessageGenerationService.name);

    generateMessage(input: MessageInput): GeneratedMessage {
        // Load matrix based on protocolId
        let matrix;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            matrix = require(`./prompt_matrix/${input.protocolId}.json`);
        } catch (e) {
            this.logger.warn(`Matrix not found for ${input.protocolId}, falling back to default transition.`);
            return {
                type: 'TRANSITION',
                tone: 'neutral',
                key: 'SystemMessages.circadian.TRANSITION',
                minimalModeLevel: input.minimalModeLevel,
                reason: input
            };
        }

        // Evaluate rules in priority order (high priority first)
        const sortedRules = [...matrix.rules].sort((a, b) => b.priority - a.priority);

        for (const rule of sortedRules) {
            // OBSERVATION MODE: If status is COMPLETED, skip normal rules (normalization, simplification, re-engagement)
            // Only allow rules that specifically mention COMPLETED status or high-priority closure rules.
            if (input.protocolStatus === 'COMPLETED') {
                const isExplicitStatusRule = rule.when.protocolStatus !== undefined || rule.when.protocolStatusBecomes !== undefined;
                const isHighPriorityClosure = rule.priority >= 900;
                if (!isExplicitStatusRule && !isHighPriorityClosure) continue;
            }

            if (this.evaluateRule(rule.when, input)) {
                return {
                    type: rule.id.toUpperCase(),
                    tone: "neutral",
                    key: rule.emit?.messageKey || rule.i18nKey,
                    selectedRuleId: rule.id,
                    minimalModeLevel: input.minimalModeLevel,
                    reason: {
                        inactivityHours: input.inactivityHours,
                        consecutiveFailures: input.consecutiveFailures,
                        frictionScore: input.frictionScore,
                        adherence7d: input.adherence7d,
                        protocolStatus: input.protocolStatus,
                        completionType: input.completionType
                    }
                };
            }
        }

        return {
            type: 'TRANSITION',
            tone: 'neutral',
            key: 'SystemMessages.circadian.TRANSITION',
            selectedRuleId: 'default_transition',
            minimalModeLevel: input.minimalModeLevel,
            reason: input
        };
    }

    private evaluateRule(when: any, i: MessageInput): boolean {
        if (when.always) return true;

        let match = true;

        if (when.minimalModeLevel !== undefined && i.minimalModeLevel !== when.minimalModeLevel) match = false;
        if (when.inactivityHoursGte !== undefined && i.inactivityHours < when.inactivityHoursGte) match = false;
        if (when.consecutiveFailuresGte !== undefined && i.consecutiveFailures < when.consecutiveFailuresGte) match = false;
        if (when.adherence7dLt !== undefined && i.adherence7d >= when.adherence7dLt) match = false;
        if (when.dayGt !== undefined && i.day <= when.dayGt) match = false;
        if (when.dayEq !== undefined && i.day !== when.dayEq) match = false;
        if (when.frictionScoreGte !== undefined && i.frictionScore < when.frictionScoreGte) match = false;
        if (when.lastCheckOptionIdEq !== undefined && i.lastCheckOptionId !== when.lastCheckOptionIdEq) match = false;
        if (when.protocolStatus !== undefined && i.protocolStatus !== when.protocolStatus) match = false;
        if (when.protocolStatusBecomes !== undefined && i.protocolStatus !== when.protocolStatusBecomes) match = false;
        if (when.completionType !== undefined && i.completionType !== when.completionType) match = false;
        if (when.isSpontaneousReturnEq !== undefined && i.isSpontaneousReturn !== when.isSpontaneousReturnEq) match = false;
        if (when.deviationTypeEq !== undefined && i.deviationType !== when.deviationTypeEq) match = false;
        if (when.canSuggestReentryEq !== undefined && i.canSuggestReentry !== when.canSuggestReentryEq) match = false;

        return match;
    }

    // Legacy support or fallback
    generateMinimalMessage(enabled: boolean, level: number = 1): string | null {
        if (!enabled) return null;
        return `SystemMessages.minimal.ON_L${level}`;
    }
}
