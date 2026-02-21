// ─────────────────────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────────────────────

export type Goal =
    | 'sleep'
    | 'energy'
    | 'digestion'
    | 'weight'
    | 'stress'
    | 'performance';

export type StepType = 'selectOne' | 'selectMany' | 'multiField' | 'info';

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding state shape
// ─────────────────────────────────────────────────────────────────────────────

export interface OnboardingData {
    primary_goal: Goal | '';

    // Dataset-specific fields
    sleep_issue_type: string[];
    energy_patterns: string[];
    digestion_patterns: string[];
    body_goal_type: string[];
    stress_pattern: string[];
    performance_focus: string[];

    // Common chronometry fields
    bedtime: string;
    caffeine_time: string;
    dinner_time: string;

    // Common assessment fields
    symptoms: string[];
    constraints: string[];
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
    primary_goal: '',
    sleep_issue_type: [],
    energy_patterns: [],
    digestion_patterns: [],
    body_goal_type: [],
    stress_pattern: [],
    performance_focus: [],
    bedtime: '23:00',
    caffeine_time: '08:00',
    dinner_time: '20:00',
    symptoms: [],
    constraints: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Step configuration types (discriminated union per type)
// ─────────────────────────────────────────────────────────────────────────────

interface StepBase {
    id: string;
    title: string;
    subtitle?: string;
    validate?: (data: OnboardingData) => { ok: boolean; message?: string };
}

export interface SelectOneStep extends StepBase {
    type: 'selectOne';
    field: keyof OnboardingData;
    options: { value: string; label: string; icon?: React.ReactNode }[];
}

export interface SelectManyStep extends StepBase {
    type: 'selectMany';
    field: keyof OnboardingData;
    options: string[];
}

export interface MultiFieldStep extends StepBase {
    type: 'multiField';
    fields: {
        field: keyof OnboardingData;
        label: string;
        inputType: string;
    }[];
}

export interface InfoStep extends StepBase {
    type: 'info';
}

export type StepConfig = SelectOneStep | SelectManyStep | MultiFieldStep | InfoStep;

// ─────────────────────────────────────────────────────────────────────────────
// Dataset flow descriptor
// ─────────────────────────────────────────────────────────────────────────────

export interface DatasetFlow {
    datasetSteps: StepConfig[];
}
