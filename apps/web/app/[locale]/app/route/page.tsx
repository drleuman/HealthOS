'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '../ProtectedRoute';
import { AmbientAnchor } from '../../components/AmbientAnchor';
import { Topbar } from '../../components/ui';

interface RouteDay {
    day: number;
    title: string;
    status: 'done' | 'current' | 'locked';
}

interface RouteData {
    program_id: string;
    current_day: number;
    duration_days: number;
    days: RouteDay[];
}

export default function RoutePage() {
    const router = useRouter();
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
            api.trackEvent('history_viewed', { program_id: 'unknown' }); // Program ID not avail until load, but event presence is key
        } else {
            router.push('/');
        }
        return () => { mounted = false; };
    }, [router]);

    const handleNavigate = (day: RouteDay) => {
        if (day.status === 'current' || day.status === 'done') {
            router.push('/app/today');
        }
    };

    if (loading) {
        return (
            <div className="layout-container justify-center items-center">
                <small className="meta animate-fade" style={{ opacity: 0.5 }}>Inicializando historial...</small>
            </div>
        );
    }

    if (!data) return null;

    return (
        <ProtectedRoute>
            <div className="layout-container pb-12">
                <Topbar currentPath="/app/route" onLogout={() => { api.logout(); router.push('/'); }} />

                <div className="animate-fade space-y-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight text-primary">Historial</h1>
                        <p className="text-sm text-secondary">Registro cronológico. Sin evaluación.</p>
                    </div>

                    <div className="space-y-8 pt-4">
                        {['Hoy', 'Ayer', 'Anteriormente'].map((group) => {
                            const groupDays = data.days.filter(d => {
                                if (group === 'Hoy') return d.day === data.current_day;
                                if (group === 'Ayer') return d.day === data.current_day - 1;
                                return d.day < data.current_day - 1;
                            }).reverse();

                            if (groupDays.length === 0) return null;

                            return (
                                <div key={group} className="space-y-3">
                                    <small className="meta opacity-40 px-1" style={{ fontSize: '10px' }}>{group.toUpperCase()}</small>
                                    <div className="space-y-3">
                                        {groupDays.map((day) => {
                                            const isDone = day.status === 'done';
                                            const isLocked = day.status === 'locked';

                                            return (
                                                <article
                                                    key={day.day}
                                                    onClick={() => !isLocked && router.push('/app/today')}
                                                    className={`card p-4 transition-all duration-150 ${isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:border-secondary'}`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="text-sm font-medium text-primary">{day.title}</div>
                                                            <div className="mt-1 text-[11px] text-secondary opacity-60">
                                                                {group} · {isDone ? 'Registrado' : '—'}
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-tertiary">
                                                            {isDone ? 'OBSERVADO' : (isLocked ? 'BLOQUEADO' : 'PENDIENTE')}
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-auto pt-12 pb-4 text-center opacity-20">
                    <small className="meta" style={{ fontSize: '9px' }}>
                        Dataset: {data.program_id.toUpperCase()} · Records: {data.duration_days}
                    </small>
                </div>
            </div>
        </ProtectedRoute>
    );
}
