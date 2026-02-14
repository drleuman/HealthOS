'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Page, Shell, Card, Button, Input, Badge } from '../../components/ui';

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

const GOALS: { value: Goal; label: string; emoji: string }[] = [
    { value: 'sleep', label: 'Dataset: Sueño', emoji: '▫️' },
    { value: 'energy', label: 'Dataset: Energía', emoji: '▫️' },
    { value: 'digestion', label: 'Dataset: Digestión', emoji: '▫️' },
    { value: 'weight', label: 'Dataset: Antropometría', emoji: '▫️' },
    { value: 'stress', label: 'Dataset: Estrés', emoji: '▫️' },
    { value: 'performance', label: 'Dataset: Rendimiento', emoji: '▫️' },
];

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
                                            className={`px-4 py-3 rounded-lg border text-left text-sm transition-all duration-150 ${data.primary_goal === goal.value
                                                    ? 'border-secondary bg-secondary/10 text-primary'
                                                    : 'border-border bg-transparent text-secondary hover:border-tertiary'
                                                }`}
                                        >
                                            <span className="font-mono mr-2">[{goal.emoji}]</span>
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
