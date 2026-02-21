import React from 'react';
import type {
    Goal,
    DatasetFlow,
    StepConfig,
    OnboardingData,
    SelectOneStep,
} from './onboarding.types';
import { GoalIcon } from './GoalIcon';

// ─────────────────────────────────────────────────────────────────────────────
// Option constants — single source of truth
// ─────────────────────────────────────────────────────────────────────────────

const SLEEP_ISSUES: string[] = [
    'Dificultad para dormir',
    'Despertares nocturnos',
    'Despertar temprano',
    'Sueño no reparador',
];

const ENERGY_PATTERNS: string[] = [
    'Baja energía matinal',
    'Caída post-prandial',
    'Fatiga vespertina',
    'Energía inestable',
    'Picos de hiperactividad',
];

const DIGESTION_PATTERNS: string[] = [
    'Hinchazón',
    'Acidez',
    'Pesadez post-comida',
    'Irregularidad intestinal',
    'Molestias crónicas',
];

const BODY_GOALS: string[] = [
    'Pérdida de grasa',
    'Ganar masa muscular',
    'Recomposición corporal',
    'Mantenimiento',
];

const STRESS_PATTERNS: string[] = [
    'Estrés constante',
    'Picos situacionales',
    'Sobrecarga mental',
    'Tensión física',
    'Ansiedad',
];

const PERFORMANCE_FOCUS: string[] = [
    'Cognitivo',
    'Físico',
    'Recuperación',
    'Resistencia',
    'Enfoque',
];

const SYMPTOMS: string[] = [
    'Fatiga crónica',
    'Niebla mental',
    'Ansiedad',
    'Cambios de humor',
    'Problemas digestivos',
    'Dolores de cabeza',
];

const CONSTRAINTS: string[] = [
    'Trabajo nocturno',
    'Niños pequeños',
    'Viajes frecuentes',
    'Horarios irregulares',
];

// ─────────────────────────────────────────────────────────────────────────────
// Goals list — icons built with React.createElement (no JSX in .ts file)
// ─────────────────────────────────────────────────────────────────────────────

const GOALS_RAW: { value: Goal; label: string }[] = [
    { value: 'sleep', label: 'Dataset: Sueño' },
    { value: 'energy', label: 'Dataset: Energía' },
    { value: 'digestion', label: 'Dataset: Digestión' },
    { value: 'weight', label: 'Dataset: Antropometría' },
    { value: 'stress', label: 'Dataset: Estrés' },
    { value: 'performance', label: 'Dataset: Rendimiento' },
];

const GOALS_OPTIONS: SelectOneStep['options'] = GOALS_RAW.map((g) => ({
    value: g.value,
    label: g.label,
    icon: React.createElement(GoalIcon, { value: g.value }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// BASE_STEPS — dataset selector (always first)
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_STEPS: StepConfig[] = [
    {
        id: 'dataset_select',
        title: 'Calibración de atención',
        subtitle:
            'Este sistema requiere momentos de observación desinteresada. No espere resultados rápidos. La eficacia reside en la persistencia del registro.',
        type: 'selectOne',
        field: 'primary_goal',
        options: GOALS_OPTIONS,
        validate: (d: OnboardingData) =>
            d.primary_goal !== ''
                ? { ok: true }
                : { ok: false, message: 'Por favor selecciona un objetivo' },
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATASET_CONFIG — per-goal step definitions
// ─────────────────────────────────────────────────────────────────────────────

export const DATASET_CONFIG: Record<Goal, DatasetFlow> = {
    sleep: {
        datasetSteps: [
            {
                id: 'sleep_state',
                title: 'Estado del Sueño',
                subtitle: 'Opcional - Identificadores de fricción',
                type: 'selectMany',
                field: 'sleep_issue_type',
                options: SLEEP_ISSUES,
            },
        ],
    },
    energy: {
        datasetSteps: [
            {
                id: 'energy_state',
                title: 'Patrones de Energía',
                subtitle: 'Opcional - Identificadores de fricción energética',
                type: 'selectMany',
                field: 'energy_patterns',
                options: ENERGY_PATTERNS,
            },
        ],
    },
    digestion: {
        datasetSteps: [
            {
                id: 'digestion_state',
                title: 'Patrones Digestivos',
                subtitle: 'Opcional - Identificadores de fricción digestiva',
                type: 'selectMany',
                field: 'digestion_patterns',
                options: DIGESTION_PATTERNS,
            },
        ],
    },
    weight: {
        datasetSteps: [
            {
                id: 'body_goal',
                title: 'Objetivo Corporal',
                subtitle: 'Opcional - Selecciona tu orientación principal',
                type: 'selectMany',
                field: 'body_goal_type',
                options: BODY_GOALS,
            },
        ],
    },
    stress: {
        datasetSteps: [
            {
                id: 'stress_state',
                title: 'Patrón de Estrés',
                subtitle: 'Opcional - Identificadores de carga adaptativa',
                type: 'selectMany',
                field: 'stress_pattern',
                options: STRESS_PATTERNS,
            },
        ],
    },
    performance: {
        datasetSteps: [
            {
                id: 'performance_focus',
                title: 'Foco de Rendimiento',
                subtitle: 'Opcional - Área principal de optimización',
                type: 'selectMany',
                field: 'performance_focus',
                options: PERFORMANCE_FOCUS,
            },
        ],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMON_STEPS — shared across all datasets, always appended last
// ─────────────────────────────────────────────────────────────────────────────

export const COMMON_STEPS: StepConfig[] = [
    {
        id: 'chronometry',
        title: 'Cronometría Habitual',
        type: 'multiField',
        fields: [
            { field: 'bedtime', label: 'Descanso (hora objetivo)', inputType: 'time' },
            { field: 'caffeine_time', label: 'Última ingesta estimulante', inputType: 'time' },
            { field: 'dinner_time', label: 'Cena habitual', inputType: 'time' },
        ],
        validate: (d: OnboardingData) =>
            d.bedtime && d.caffeine_time && d.dinner_time
                ? { ok: true }
                : { ok: false, message: 'Completa los tres horarios' },
    },
    {
        id: 'symptoms',
        title: 'Sintomatología',
        subtitle: 'Opcional - Observaciones presentes',
        type: 'selectMany',
        field: 'symptoms',
        options: SYMPTOMS,
    },
    {
        id: 'constraints',
        title: 'Entorno Dinámico',
        subtitle: 'Opcional - Limitaciones de diseño',
        type: 'selectMany',
        field: 'constraints',
        options: CONSTRAINTS,
    },
];
