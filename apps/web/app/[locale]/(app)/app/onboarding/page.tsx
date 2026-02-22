'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { api } from '@/lib/api';

import { INITIAL_ONBOARDING_DATA } from './onboarding.types';
import type { OnboardingData, Goal } from './onboarding.types';
import { BASE_STEPS, DATASET_CONFIG, COMMON_STEPS } from './onboarding.config';
import { OnboardingStepRenderer } from './OnboardingStepRenderer';
import { buildAssessmentPayload } from './buildAssessmentPayload';

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const router = useRouter();

    const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [started, setStarted] = useState(false);

    // Track quiz start
    useEffect(() => {
        if (!started) {
            api.trackEvent('quiz_start');
            setStarted(true);
        }
    }, [started]);

    // Build step list dynamically whenever primary_goal changes.
    const currentSteps = useMemo(() => {
        if (!data.primary_goal) return BASE_STEPS;

        return [
            ...BASE_STEPS,
            ...DATASET_CONFIG[data.primary_goal as Goal].datasetSteps,
            ...COMMON_STEPS,
        ];
    }, [data.primary_goal]);

    const currentStep = currentSteps[currentIndex];
    const isLastStep = currentIndex === currentSteps.length - 1;
    const progress = ((currentIndex + 1) / currentSteps.length) * 100;

    // ── Validation ──────────────────────────────────────────────────────────

    const canContinue = (): boolean => {
        if (!currentStep) return false;
        if (!currentStep.validate) return true;
        return currentStep.validate(data).ok;
    };

    // ── Data update with dataset reset guard ────────────────────────────────
    // When the user changes primary_goal (always at index 0, the BASE_STEP),
    // reset all dataset-specific arrays to avoid shipping stale data.

    const handleSetData = (next: OnboardingData) => {
        if (next.primary_goal !== data.primary_goal && currentIndex === 0) {
            setData({
                ...next,
                sleep_issue_type: [],
                energy_patterns: [],
                digestion_patterns: [],
                body_goal_type: [],
                stress_pattern: [],
                performance_focus: [],
            });
        } else {
            setData(next);
        }
    };

    // ── Navigation ──────────────────────────────────────────────────────────

    const handleNext = () => {
        if (isLastStep) {
            void handleSubmit();
        } else {
            setCurrentIndex((i) => i + 1);
        }
    };

    const handleBack = () => {
        setCurrentIndex((i) => Math.max(0, i - 1));
    };

    // ── Submit ──────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!data.primary_goal) {
            setError('Por favor selecciona un objetivo');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const payload = buildAssessmentPayload(data);
            // This 'stages' array seems to be intended for a different file (e.g., GrowthService)
            // and is not used within OnboardingPage. Inserting it here would be a syntax error
            // due to the malformed snippet provided.
            // If the intention was to add it to a GrowthService file, that file is not provided.
            // As per instructions, I must ensure the resulting file is syntactically correct.
            // Therefore, I am omitting the 'stages' array as it would break this file.

            if (api.isAuthenticated()) {
                await api.submitAssessment(payload);

                api.trackEvent('onboarding_completed', {
                    goal: data.primary_goal,
                    symptoms_count: data.symptoms.length,
                });

                router.push('/today');
            } else {
                // Anonymous mode: save for later reconciliation
                localStorage.setItem('pending_assessment', JSON.stringify(payload));

                api.trackEvent('onboarding_completed_anonymous', {
                    goal: data.primary_goal,
                });

                router.push('/onboarding/result');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al procesar');
            setLoading(false);
        }
    };

    if (!currentStep) return null;

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <main className="layout-container justify-center pb-20">
            <div className="animate-fade space-y-8">

                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-primary">
                        Calibración del Sistema
                    </h1>
                    <p className="text-sm text-secondary">
                        Estableciendo línea base de observación.
                    </p>
                </div>

                {/* Progress bar */}
                <div className="w-full h-[2px] bg-border rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Step card */}
                <section className="card space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-xl font-medium text-primary">
                            {currentStep.title}
                        </h2>
                        {currentStep.subtitle && (
                            <p className="text-sm text-secondary leading-relaxed">
                                {currentStep.subtitle}
                            </p>
                        )}
                        <OnboardingStepRenderer
                            step={currentStep}
                            data={data}
                            setData={handleSetData}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center rounded-lg">
                            {error}
                        </div>
                    )}
                </section>

                {/* Navigation */}
                <div className="flex gap-3">
                    {currentIndex > 0 && (
                        <button
                            onClick={handleBack}
                            disabled={loading}
                            className="flex-1 btn border-border bg-transparent text-secondary hover:border-tertiary py-3"
                        >
                            Retroceder
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!canContinue() || loading}
                        className="flex-[2] btn btn-primary py-3"
                    >
                        {loading
                            ? 'Inicializando...'
                            : isLastStep
                                ? 'Abrir entorno'
                                : 'Siguiente fase'}
                    </button>
                </div>

                <div className="text-center">
                    <small className="meta opacity-20">FASE FINAL DE CALIBRACIÓN</small>
                </div>
            </div>
        </main>
    );
}
