'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/navigation';
import { api } from '@/lib/api';
import { Page, Shell, Card, Button, Input, Badge } from '@/components/ui';

type Goal = 'sleep' | 'energy' | 'digestion' | 'weight' | 'stress' | 'performance';

interface OnboardingData {
    primary_goal: Goal | '';
    sleep_issue_type: string[];
    low_energy_window: string;
    bedtime: string;
    caffeine_time: string;
    dinner_time: string;
    symptoms: string[];
    constraints: string[];
}

const GOALS: { value: Goal; label: string }[] = [
    { value: 'sleep', label: 'Dataset: Sueño' },
    { value: 'energy', label: 'Dataset: Energía' },
    { value: 'digestion', label: 'Dataset: Digestión' },
    { value: 'weight', label: 'Dataset: Antropometría' },
    { value: 'stress', label: 'Dataset: Estrés' },
    { value: 'performance', label: 'Dataset: Rendimiento' },
];

function GoalIcon({ value }: { value: Goal }) {
    const cls = 'w-4 h-4 shrink-0';
    switch (value) {
        case 'sleep': return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
        );
        case 'energy': return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
        );
        case 'digestion': return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
        );
        case 'weight': return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97Z" />
            </svg>
        );
        case 'stress': return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
        );
        case 'performance': return (
            <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
        );
    }
}


const SLEEP_ISSUES = [
    'Dificultad para dormir',
    'Despertares nocturnos',
    'Despertar temprano',
    'Sueño no reparador',
];

const SYMPTOMS = [
    'Fatiga crónica',
    'Niebla mental',
    'Ansiedad',
    'Cambios de humor',
    'Problemas digestivos',
    'Dolores de cabeza',
];

const CONSTRAINTS = [
    'Trabajo nocturno',
    'Niños pequeños',
    'Viajes frecuentes',
    'Horarios irregulares',
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [data, setData] = useState<OnboardingData>({
        primary_goal: '',
        sleep_issue_type: [],
        low_energy_window: '',
        bedtime: '23:00',
        caffeine_time: '08:00',
        dinner_time: '20:00',
        symptoms: [],
        constraints: [],
    });

    const handleSubmit = async () => {
        if (!data.primary_goal) {
            setError('Por favor selecciona un objetivo');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.submitAssessment({
                primary_goal: data.primary_goal as Goal,
                sleep_issue_type: data.sleep_issue_type.length > 0 ? data.sleep_issue_type : undefined,
                low_energy_window: data.low_energy_window || undefined,
                bedtime: data.bedtime,
                caffeine_time: data.caffeine_time,
                dinner_time: data.dinner_time,
                symptoms: data.symptoms.length > 0 ? data.symptoms : undefined,
                constraints: data.constraints.length > 0 ? data.constraints : undefined,
            });

            api.trackEvent('onboarding_completed', {
                goal: data.primary_goal,
                symptoms_count: data.symptoms.length,
            });

            router.push('/today');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al procesar');
            setLoading(false);
        }
    };

    const toggleArrayItem = (array: string[], item: string) => {
        return array.includes(item)
            ? array.filter((i) => i !== item)
            : [...array, item];
    };

    const canContinue = () => {
        switch (step) {
            case 1: return data.primary_goal !== '';
            case 2: return true;
            case 3: return data.bedtime && data.caffeine_time && data.dinner_time;
            case 4: return true;
            case 5: return true;
            default: return false;
        }
    };

    return (
        <main className="layout-container justify-center pb-20">
            <div className="animate-fade space-y-8">
                {/* Header Section */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-primary">Calibración del Sistema</h1>
                    <p className="text-sm text-secondary">Estableciendo línea base de observación.</p>
                </div>

                {/* Progress bar (hardware style) */}
                <div className="w-full h-[2px] bg-border rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${(step / 5) * 100}%` }}
                    />
                </div>

                <section className="card space-y-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-medium text-primary">Calibración de atención</h2>
                            <p className="text-sm text-secondary leading-relaxed">
                                Este sistema requiere momentos de observación desinteresada. No espere resultados rápidos. La eficacia reside en la persistencia del registro.
                            </p>

                            <div className="pt-4 space-y-3">
                                <label className="label">Seleccionar Dataset de Enfoque</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {GOALS.map((goal) => (
                                        <button
                                            key={goal.value}
                                            onClick={() => setData({ ...data, primary_goal: goal.value })}
                                            className={`px-4 py-3 rounded-lg border text-left text-sm transition-all duration-150 flex items-center gap-3 ${data.primary_goal === goal.value
                                                ? 'border-secondary bg-secondary/10 text-primary'
                                                : 'border-border bg-transparent text-secondary hover:border-tertiary'
                                                }`}
                                        >
                                            <GoalIcon value={goal.value} />
                                            {goal.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-medium text-primary">Estado del Sueño</h2>
                            <p className="text-sm text-secondary">Opcional - Identificadores de fricción</p>
                            <div className="space-y-2">
                                {SLEEP_ISSUES.map((issue) => (
                                    <button
                                        key={issue}
                                        onClick={() => setData({ ...data, sleep_issue_type: toggleArrayItem(data.sleep_issue_type, issue) })}
                                        className={`w-full px-4 py-3 rounded-lg border text-left text-sm transition-all duration-150 ${data.sleep_issue_type.includes(issue)
                                            ? 'border-secondary bg-secondary/10 text-primary'
                                            : 'border-border bg-transparent text-secondary hover:border-tertiary'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 border ${data.sleep_issue_type.includes(issue) ? 'bg-secondary border-secondary' : 'border-tertiary'}`} />
                                            <span>{issue}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-medium text-primary">Cronometría Habitual</h2>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="label">Descanso (hora objetivo)</label>
                                    <input type="time" value={data.bedtime} onChange={(e) => setData({ ...data, bedtime: e.target.value })} className="input" />
                                </div>
                                <div className="space-y-2">
                                    <label className="label">Última ingesta estimulante</label>
                                    <input type="time" value={data.caffeine_time} onChange={(e) => setData({ ...data, caffeine_time: e.target.value })} className="input" />
                                </div>
                                <div className="space-y-2">
                                    <label className="label">Cena habitual</label>
                                    <input type="time" value={data.dinner_time} onChange={(e) => setData({ ...data, dinner_time: e.target.value })} className="input" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-medium text-primary">Sintomatología</h2>
                            <p className="text-sm text-secondary">Opcional - Observaciones presentes</p>
                            <div className="space-y-2">
                                {SYMPTOMS.map((symptom) => (
                                    <button
                                        key={symptom}
                                        onClick={() => setData({ ...data, symptoms: toggleArrayItem(data.symptoms, symptom) })}
                                        className={`w-full px-4 py-3 rounded-lg border text-left text-sm transition-all duration-150 ${data.symptoms.includes(symptom)
                                            ? 'border-secondary bg-secondary/10 text-primary'
                                            : 'border-border bg-transparent text-secondary hover:border-tertiary'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 border ${data.symptoms.includes(symptom) ? 'bg-secondary border-secondary' : 'border-tertiary'}`} />
                                            <span>{symptom}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-medium text-primary">Entorno Dinámico</h2>
                            <p className="text-sm text-secondary">Opcional - Limitaciones de diseño</p>
                            <div className="space-y-2">
                                {CONSTRAINTS.map((constraint) => (
                                    <button
                                        key={constraint}
                                        onClick={() => setData({ ...data, constraints: toggleArrayItem(data.constraints, constraint) })}
                                        className={`w-full px-4 py-3 rounded-lg border text-left text-sm transition-all duration-150 ${data.constraints.includes(constraint)
                                            ? 'border-secondary bg-secondary/10 text-primary'
                                            : 'border-border bg-transparent text-secondary hover:border-tertiary'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 border ${data.constraints.includes(constraint) ? 'bg-secondary border-secondary' : 'border-tertiary'}`} />
                                            <span>{constraint}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center rounded-lg">
                            {error}
                        </div>
                    )}
                </section>

                <div className="flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            disabled={loading}
                            className="flex-1 btn border-border bg-transparent text-secondary hover:border-tertiary py-3"
                        >
                            Retroceder
                        </button>
                    )}
                    <button
                        onClick={step < 5 ? () => setStep(step + 1) : handleSubmit}
                        disabled={!canContinue() || loading}
                        className="flex-[2] btn btn-primary py-3"
                    >
                        {loading ? 'Inicializando...' : (step < 5 ? 'Siguiente fase' : 'Abrir entorno')}
                    </button>
                </div>

                <div className="text-center">
                    <small className="meta opacity-20">FASE FINAL DE CALIBRACIÓN</small>
                </div>
            </div>
        </main>
    );
}
