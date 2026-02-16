export type DeviationType = 'DRIFT' | 'LATENT_INSTABILITY' | 'CRITICAL_DISCONNECT';

export interface DeviationEvidence {
    recent?: Array<'better' | 'same' | 'worse' | string>; // últimos N efectos usados
    windowDays?: number;                         // ventana aplicada a la evidencia
    minGapDaysForSpontaneous?: number;           // umbral para retorno espontáneo
    gapHours?: number;
}

export interface DeviationState {
    type: DeviationType;
    severity: number;           // 0..1
    active: boolean;
    triggeredAt: string;        // ISO
    lastEvaluatedAt: string;    // ISO
    ruleId: string;             // p.ej. "DEV_DRIFT_3W_7D"
    evidence?: DeviationEvidence;
    clearedAt?: string;         // ISO si se limpia
    evalCount?: number;         // Telemetry
}

export interface ReentryState {
    suggestedAt?: string;       // ISO (evento UI)
    cooldownUntil?: string;     // ISO
    acceptedAt?: string;        // ISO
    declinedAt?: string;        // ISO
    lastSuggestionRuleId?: string;
    suggestionCount?: number;   // Telemetry
}

export interface RecalibrationState {
    status: 'NONE' | 'OFFERED' | 'ACTIVE' | 'COMPLETED' | 'DECLINED';
    planId?: 'recalibration_3d';
    dayIndex?: number;
    startedAt?: string;
    completedAt?: string;
    declinedAt?: string;
    reason?: string;           // e.g. drift_detected
}

export interface BehaviorContextV1 {
    version: 1;
    lastUpdate?: string;

    // métricas conductuales
    consecutiveFailures?: number;
    consecutiveSuccess?: number;
    stagnationDays?: number;

    // análisis “instrumental”
    lastSignal?: string;

    // desviación (flag analítico)
    deviation?: DeviationState | null;

    // control de propuesta de re-entry (evento UI)
    reentry?: ReentryState;

    // micro-intervención activa
    recalibration?: RecalibrationState;

    // legacy support
    [key: string]: any;
}
