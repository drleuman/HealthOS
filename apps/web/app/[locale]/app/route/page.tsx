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
                <small className="meta animate-fade">LOADING_SEQUENCE...</small>
            </div>
        );
    }

    if (!data) return null;

    return (
        <ProtectedRoute>
            <div className="layout-container">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 border-b border-[var(--border)] pb-4">
                    <div className="flex flex-col gap-1">
                        <small className="meta">PROGRAM: {data.program_id.toUpperCase()}</small>
                        <small className="meta">TOTAL_RECORDS: {data.duration_days}</small>
                    </div>
                </div>

                <div className="section">
                    <small className="meta mb-2 block">SEQUENCE_LOG</small>

                    <div className="flex flex-col gap-2">
                        {data.days.map((day) => {
                            const isCurrent = day.status === 'current';
                            const isLocked = day.status === 'locked';
                            const isDone = day.status === 'done';

                            return (
                                <div
                                    key={day.day}
                                    onClick={() => !isLocked && handleNavigate(day)}
                                    className={`
                                        p-4 rounded-[var(--radius-sm)] border flex justify-between items-center transition-all duration-100
                                        ${isLocked ? 'opacity-40 cursor-not-allowed border-transparent' : 'cursor-pointer'}
                                        ${isCurrent ? 'border-[var(--accent)] bg-[var(--bg-card)]' : 'border-[var(--border)]'}
                                        ${isDone ? 'border-transparent bg-transparent hover:bg-[var(--bg-hover)]' : ''}
                                    `}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            {isCurrent && <div className="status-dot active"></div>}
                                            <span style={{
                                                fontSize: '14px',
                                                fontFamily: 'var(--font-mono)',
                                                color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)'
                                            }}>
                                                REF_{day.day.toString().padStart(4, '0')}
                                            </span>
                                        </div>
                                        <span className="meta" style={{ fontSize: '10px' }}>
                                            {day.title || 'STANDARD_PROTOCOL'}
                                        </span>
                                    </div>

                                    <div className="text-right">
                                        <small className="meta block" style={{
                                            color: isCurrent ? 'var(--accent)' : (isDone ? 'var(--text-tertiary)' : 'var(--text-tertiary)')
                                        }}>
                                            [{isDone ? 'OBSERVED' : (isCurrent ? '—' : 'LOCKED')}]
                                        </small>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '40px', paddingBottom: '20px', textAlign: 'center' }}>
                    <small className="meta" style={{ opacity: 0.3, fontSize: '10px' }}>
                        System available. State may be captured at any moment.
                    </small>
                </div>
            </div>
        </ProtectedRoute>
    );
}
