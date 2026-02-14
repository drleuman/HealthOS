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
        <Page>
            <Shell>
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '12px' }}>
                        <div style={{ height: '100%', background: 'var(--primary)', width: `${(step / 5) * 100}%`, transition: 'width 0.3s ease' }} />
                    </div>
                    <Badge>Configuración: Nivel {step} de 5</Badge>
                </div>

                <Card>
                    {step === 1 && (
                        <>
                            <h2 style={{ marginBottom: '24px' }}>Flujo de datos principal</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {GOALS.map((goal) => (
                                    <button
                                        key={goal.value}
                                        onClick={() => setData({ ...data, primary_goal: goal.value })}
                                        className={`list-item ${data.primary_goal === goal.value ? 'active' : ''}`}
                                        style={{
                                            flexDirection: 'column',
                                            padding: '20px',
                                            textAlign: 'center',
                                            borderColor: data.primary_goal === goal.value ? 'var(--primary)' : 'transparent',
                                            background: data.primary_goal === goal.value ? 'rgba(124, 92, 255, 0.1)' : 'rgba(255,255,255,0.03)'
                                        }}
                                    >
                                        <span style={{ fontSize: '32px', marginBottom: '8px' }}>{goal.emoji}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{goal.label}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 style={{ marginBottom: '8px' }}>¿Qué problemas de sueño tienes?</h2>
                            <p style={{ marginBottom: '24px', opacity: 0.7 }}>Opcional - selecciona los que apliquen</p>
                            <div className="list">
                                {SLEEP_ISSUES.map((issue) => (
                                    <div
                                        key={issue}
                                        className={`list-item ${data.sleep_issue_type.includes(issue) ? 'completed' : ''}`}
                                        onClick={() => setData({ ...data, sleep_issue_type: toggleArrayItem(data.sleep_issue_type, issue) })}
                                    >
                                        <div className="checkbox"></div>
                                        <span>{issue}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 style={{ marginBottom: '24px' }}>Tus horarios habituales</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <Input label="¿A qué hora te acuestas?" type="time" value={data.bedtime} onChange={(v) => setData({ ...data, bedtime: v })} />
                                <Input label="¿A qué hora tomas cafeína?" type="time" value={data.caffeine_time} onChange={(v) => setData({ ...data, caffeine_time: v })} />
                                <Input label="¿A qué hora cenas?" type="time" value={data.dinner_time} onChange={(v) => setData({ ...data, dinner_time: v })} />
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h2 style={{ marginBottom: '8px' }}>¿Qué síntomas experimentas?</h2>
                            <p style={{ marginBottom: '24px', opacity: 0.7 }}>Opcional - selecciona los que apliquen</p>
                            <div className="list">
                                {SYMPTOMS.map((symptom) => (
                                    <div
                                        key={symptom}
                                        className={`list-item ${data.symptoms.includes(symptom) ? 'completed' : ''}`}
                                        onClick={() => setData({ ...data, symptoms: toggleArrayItem(data.symptoms, symptom) })}
                                    >
                                        <div className="checkbox"></div>
                                        <span>{symptom}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {step === 5 && (
                        <>
                            <h2 style={{ marginBottom: '8px' }}>Limitaciones de estilo de vida</h2>
                            <p style={{ marginBottom: '24px', opacity: 0.7 }}>Opcional</p>
                            <div className="list">
                                {CONSTRAINTS.map((constraint) => (
                                    <div
                                        key={constraint}
                                        className={`list-item ${data.constraints.includes(constraint) ? 'completed' : ''}`}
                                        onClick={() => setData({ ...data, constraints: toggleArrayItem(data.constraints, constraint) })}
                                    >
                                        <div className="checkbox"></div>
                                        <span>{constraint}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {error && (
                        <div style={{ marginTop: '20px', color: 'var(--danger)', fontSize: '14px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}
                </Card>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    {step > 1 && (
                        <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={loading}>
                            Atrás
                        </Button>
                    )}
                    <Button
                        onClick={step < 5 ? () => setStep(step + 1) : handleSubmit}
                        disabled={!canContinue() || loading}
                        style={{ flex: 1 }}
                    >
                        {loading ? 'Inicializando...' : (step < 5 ? 'Siguiente' : 'Abrir entorno')}
                    </Button>
                </div>
            </Shell>
        </Page>
    );
}
