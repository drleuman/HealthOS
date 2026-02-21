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
    const t = useTranslations('App.History');
    const [data, setData] = useState<RouteData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadRoute = async () => {
            try {
                const result = await api.getRoute();
                // Handle new API envelope { data: {...} } or direct response
                const routeData = result?.data || result;
                // Only set data if it has a valid days array
                if (mounted) {
                    setData(Array.isArray(routeData?.days) ? routeData : { ...routeData, days: [] });
                }
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

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div></div>;
    if (!data) return null;

    // Defensive: ensure days is always an array
    const days = Array.isArray(data.days) ? data.days : [];

    // Helper to group days
    const getGroup = (day: RouteDay, current: number) => {
        if (day.day === current) return 'Hoy';
        if (day.day === current - 1) return 'Ayer';
        return 'Anteriormente';
    };

    return (
        <ProtectedRoute>
            <div className="space-y-8 animate-fade pb-12 max-w-2xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">{t('title')}</h1>
                    <p className="text-slate-400 text-sm mt-1">{t('subtitle')}</p>
                </header>

                <div className="space-y-8">
                    {['Hoy', 'Ayer', 'Anteriormente'].map((group) => {
                        const groupDays = days.filter(d => getGroup(d, data.current_day) === group).reverse();

                        if (groupDays.length === 0) return null;

                        return (
                            <div key={group}>
                                <div className="text-slate-500 text-[10px] font-medium uppercase tracking-wider mb-3 pl-1">{group}</div>
                                <div className="space-y-1">
                                    {groupDays.map((day) => {
                                        const isDone = day.status === 'done';
                                        return (
                                            <div key={day.day} className="rounded-lg border border-slate-800/40 bg-slate-900/20 p-4 flex items-center justify-between transition-all hover:bg-slate-900/40">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-1.5 w-1.5 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                                                    <div>
                                                        <div className="text-slate-200 text-sm font-medium">{day.title}</div>
                                                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Día {day.day} • {day.timestamp ? new Date(day.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}</div>
                                                    </div>
                                                </div>

                                                {isDone ? (
                                                    <span className="text-emerald-500 text-[10px] font-medium tracking-wide uppercase">
                                                        {t('item_observed')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700 text-xs px-2">
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

                    {/* Empty State: no days or no completions yet */}
                    {days.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center">
                            <p className="text-slate-500 text-sm mb-4">Aún no tienes un protocolo activo. Completa el onboarding para comenzar.</p>
                            <button onClick={() => router.push('/app/today')} className="text-sky-400 hover:text-sky-300 hover:underline text-xs font-medium uppercase tracking-wide">
                                Ir al registro de hoy
                            </button>
                        </div>
                    ) : days.filter(d => d.status === 'done').length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center">
                            <p className="text-slate-500 text-sm mb-4">{t('empty')}</p>
                            <button onClick={() => router.push('/app/today')} className="text-sky-400 hover:text-sky-300 hover:underline text-xs font-medium uppercase tracking-wide">
                                Ir al registro de hoy
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
