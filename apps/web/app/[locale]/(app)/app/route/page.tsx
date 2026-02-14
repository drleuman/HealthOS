'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/lib/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '../ProtectedRoute';
import { useTranslations } from 'next-intl';

interface RouteDay {
    day: number;
    title: string;
    status: 'done' | 'current' | 'locked';
    timestamp?: string;
}

interface RouteData {
    program_id: string;
    current_day: number;
    duration_days: number;
    days: RouteDay[];
}

export default function RoutePage() {
    const router = useRouter();
    const t = useTranslations('Dashboard');
    const [data, setData] = useState<RouteData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadRoute = async () => {
            try {
                const result = await api.getRoute();
                if (mounted) setData(result);
            } catch (err) {
                console.error('Error loading route:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (api.isAuthenticated()) {
            loadRoute();
        } else {
            router.push('/');
        }
        return () => { mounted = false; };
    }, [router]);

    if (loading) return <div className="text-center p-12 text-slate-500 text-sm animate-pulse">Cargando historial...</div>;
    if (!data) return null;

    // Helper to group days
    const getGroup = (day: RouteDay, current: number) => {
        if (day.day === current) return 'Hoy';
        if (day.day === current - 1) return 'Ayer';
        return 'Anteriormente';
    };

    return (
        <ProtectedRoute>
            <div className="space-y-8 animate-fade pb-12">
                <header>
                    <h1 className="text-3xl font-semibold text-slate-100">Historial</h1>
                    <p className="text-slate-400 mt-2">Registro cronológico. Sin evaluación.</p>
                </header>

                <div className="space-y-8">
                    {['Hoy', 'Ayer', 'Anteriormente'].map((group) => {
                        const groupDays = data.days.filter(d => getGroup(d, data.current_day) === group).reverse();

                        if (groupDays.length === 0) return null;

                        return (
                            <div key={group}>
                                <div className="text-slate-500 text-xs uppercase tracking-wide mb-4 pl-1">{group}</div>
                                <div className="space-y-3">
                                    {groupDays.map((day) => {
                                        const isDone = day.status === 'done';
                                        return (
                                            <div key={day.day} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between transition-colors hover:bg-slate-900/60">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-2 w-2 rounded-full ${isDone ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)]' : 'bg-slate-700'}`}></div>
                                                    <div>
                                                        <div className="text-slate-100 font-medium">{day.title}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">Día {day.day} • {day.timestamp ? new Date(day.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sin hora'}</div>
                                                    </div>
                                                </div>

                                                {isDone ? (
                                                    <span className="bg-slate-800/60 text-slate-200 border border-slate-800 px-2 py-1 rounded-lg text-xs font-medium tracking-wide">
                                                        OBSERVADO
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-xs px-2">
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty State */}
                    {data.days.filter(d => d.status === 'done').length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
                            <p className="text-slate-400 mb-4">No hay registros de observación aún.</p>
                            <button onClick={() => router.push('/app/today')} className="text-cyan-200 hover:text-cyan-100 hover:underline text-sm font-medium">
                                Registrar primera observación
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
