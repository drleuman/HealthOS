'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminSystem({ params: { locale } }: { params: { locale: string } }) {
    const t = useTranslations('App.Admin');
    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const fetchData = () => {
            api.adminSystem()
                .then(res => {
                    if (mounted) setSystemInfo(res);
                })
                .catch(err => console.error(err))
                .finally(() => {
                    if (mounted) setLoading(false);
                });
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto refresh
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'degraded': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'at_risk': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t('system')}</h1>
                    <p className="text-slate-400 mt-1">Real-time telemetry and intelligent health monitoring.</p>
                </div>
                {systemInfo && (
                    <div className={`px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${getStatusColor(systemInfo.status)}`}>
                        <span className={`w-2 h-2 rounded-full animate-pulse ${systemInfo.status === 'healthy' ? 'bg-emerald-400' : (systemInfo.status === 'degraded' ? 'bg-amber-400' : 'bg-rose-400')}`}></span>
                        {systemInfo.status.replace('_', ' ').toUpperCase()}
                    </div>
                )}
            </div>

            {loading && !systemInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-32 animate-pulse"></div>
                    ))}
                </div>
            ) : systemInfo && (
                <div className="space-y-8">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            title="Requests/min"
                            value={systemInfo.requestsCurrentMinute}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                            color="text-sky-400"
                            bg="bg-sky-500/10"
                        />
                        <MetricCard
                            title="Errors (1h)"
                            value={systemInfo.errorsLastHour}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
                            color={systemInfo.errorsLastHour > 0 ? "text-rose-400" : "text-emerald-400"}
                            bg={systemInfo.errorsLastHour > 0 ? "bg-rose-500/10" : "bg-emerald-500/10"}
                        />
                        <MetricCard
                            title="Uptime"
                            value={formatDuration(systemInfo.uptime)}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                            color="text-emerald-400"
                            bg="bg-emerald-500/10"
                        />
                        <MetricCard
                            title="Critical Alerts"
                            value={systemInfo.criticalLastHour}
                            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />}
                            color={systemInfo.criticalLastHour > 0 ? "text-rose-400" : "text-slate-400"}
                            bg={systemInfo.criticalLastHour > 0 ? "bg-rose-500/10" : "bg-slate-500/10"}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* System Info Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Environment Details</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <InfoRow label="Node Version" value={process.env.NEXT_PUBLIC_NODE_VERSION || 'v20.x'} />
                                <InfoRow label="Release Tag" value={systemInfo.version} mono />
                                <InfoRow label="Environment" value={systemInfo.nodeEnv.toUpperCase()} color={systemInfo.nodeEnv === 'production' ? 'text-amber-400' : 'text-sky-400'} />
                                <InfoRow label="Server Time" value={new Date(systemInfo.timestamp).toLocaleTimeString()} />
                            </div>
                        </div>

                        {/* Health Log / Events Placeholder */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-900 to-slate-950">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <h3 className="text-white font-semibold">Historical Time-series</h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-xs">
                                Metric snapshots are being persisted every 60s to the database. Dashboard charts for trend analysis are coming soon.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, icon, color, bg }: any) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${bg} ${color}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {icon}
                    </svg>
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Live</div>
            </div>
            <div>
                <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{value}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{title}</div>
            </div>
        </div>
    );
}

function InfoRow({ label, value, mono, color }: any) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-800/30 last:border-0">
            <span className="text-slate-500 text-xs font-medium">{label}</span>
            <span className={`text-sm ${mono ? 'font-mono' : 'font-medium'} ${color || 'text-slate-200'}`}>{value}</span>
        </div>
    );
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
