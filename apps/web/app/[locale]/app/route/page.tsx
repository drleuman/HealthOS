'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '../ProtectedRoute';
import { AmbientAnchor } from '../../components/AmbientAnchor';

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
            <div className="layout-container">
                {/* Header: Minimal logout and title */}
                <div className="flex justify-between items-center mb-12">
                    <button onClick={() => router.push('/app/today')} className="meta opacity-40 hover:opacity-100 transition-all" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        ← Atrás
                    </button>
                    <span className="meta opacity-20" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>HISTORIAL</span>
                </div>

                <div className="section">
                    <div className="flex flex-col gap-12">
                        {['Hoy', 'Ayer', 'Anteriormente'].map((group) => {
                            const groupDays = data.days.filter(d => {
                                if (group === 'Hoy') return d.day === data.current_day;
                                if (group === 'Ayer') return d.day === data.current_day - 1;
                                return d.day < data.current_day - 1;
                            }).reverse();

                            if (groupDays.length === 0) return null;

                            return (
                                <div key={group} className="flex flex-col gap-6">
                                    <small className="meta opacity-30 px-2" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>{group.toUpperCase()}</small>
                                    <div className="flex flex-col gap-4">
                                        {groupDays.map((day) => {
                                            const isCurrent = day.status === 'current';
                                            const isDone = day.status === 'done';

                                            return (
                                                <div
                                                    key={day.day}
                                                    onClick={() => !isCurrent && day.status !== 'locked' && handleNavigate(day)}
                                                    className={`
                                                        px-2 py-1 flex justify-between items-baseline group transition-all duration-300
                                                        ${day.status === 'locked' ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    <div className="flex items-baseline gap-4">
                                                        <span className="meta opacity-20 group-hover:opacity-100 transition-all" style={{ fontSize: '9px', minWidth: '12px' }}>
                                                            {day.day}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '14px',
                                                            color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                            opacity: isDone ? 0.6 : 1
                                                        }}>
                                                            {day.title}
                                                        </span>
                                                    </div>

                                                    <div className="text-right">
                                                        <small className="meta group-hover:opacity-100 transition-all" style={{
                                                            fontSize: '9px',
                                                            opacity: 0.3,
                                                            color: isCurrent ? 'var(--accent)' : 'inherit'
                                                        }}>
                                                            {isCurrent ? 'Actual' : (isDone ? 'Completado' : '')}
                                                        </small>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-auto pt-12 pb-8 text-center opacity-10">
                    <small className="meta" style={{ fontSize: '9px' }}>
                        Dataset: {data.program_id.toUpperCase()} · Records: {data.duration_days}
                    </small>
                </div>
            </div>
        </ProtectedRoute>
    );
}
