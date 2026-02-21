'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminOverview() {
    const t = useTranslations('App.Admin');
    const [period, setPeriod] = useState('7d');
    const [data, setData] = useState<any>(null);
    const [alertsData, setAlertsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        Promise.all([
            api.adminOverview(period),
            api.adminAlertsOverview()
        ])
            .then(([resOverview, resAlerts]) => {
                if (mounted) {
                    setData(resOverview);
                    setAlertsData(resAlerts);
                }
            })
            .catch(err => {
                if (mounted) setError(err.message);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [period]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-100">{t('overview')}</h1>

                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
                    {['24h', '7d', '30d'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {loading && !data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-32 bg-slate-900 rounded-xl border border-slate-800"></div>
                    ))}
                </div>
            )}

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                    {error}
                </div>
            )}

            {!loading && data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                    {/* Stat Cards */}
                    <StatCard title={t('total_users')} value={data.totalUsers} />
                    <StatCard title={t('active_users')} value={data.activeUsers} />
                    <StatCard title={t('new_users_7d')} value={data.newUsers} />
                    <StatCard title={t('events_last_60m')} value={data.eventsLast60Min} />

                    <Link href="/admin/alerts" className="block outline-none focus:ring-2 focus:ring-sky-500 rounded-xl">
                        <StatCard
                            title={t('alerts.overview_card.subtitle')}
                            value={alertsData || 0}
                            isError={(alertsData || 0) > 0}
                        />
                    </Link>
                </div>
            )}

            {!loading && data && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">Conversion Funnel</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-center items-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-blue-500/5 transition-opacity opacity-0 group-hover:opacity-100"></div>
                                <span className="text-slate-400 text-sm font-medium mb-1 z-10">Paywall Impressions</span>
                                <span className="text-3xl font-bold text-blue-400 z-10">{data.funnel.impressions}</span>
                            </div>
                            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-center items-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-indigo-500/5 transition-opacity opacity-0 group-hover:opacity-100"></div>
                                <span className="text-slate-400 text-sm font-medium mb-1 z-10">CTA Clicks</span>
                                <span className="text-3xl font-bold text-indigo-400 z-10">{data.funnel.clicks}</span>
                                <span className="text-xs text-slate-500 mt-2 z-10">
                                    {data.funnel.impressions ? Math.round((data.funnel.clicks / data.funnel.impressions) * 100) : 0}% CTR
                                </span>
                            </div>
                            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-center items-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-emerald-500/5 transition-opacity opacity-0 group-hover:opacity-100"></div>
                                <span className="text-slate-400 text-sm font-medium mb-1 z-10">Conversions</span>
                                <span className="text-3xl font-bold text-emerald-400 z-10">{data.funnel.conversions}</span>
                                <span className="text-xs text-slate-500 mt-2 z-10">
                                    {data.funnel.impressions ? Math.round((data.funnel.conversions / data.funnel.impressions) * 100) : 0}% Conversion
                                </span>
                            </div>
                        </div>

                        {/* New Conversion by Feature breakdown */}
                        <div className="col-span-1 p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col">
                            <span className="text-slate-200 text-sm font-medium mb-4 z-10">Conversion by Feature</span>
                            <div className="space-y-3 flex-1 flex flex-col justify-center">
                                {/* Placeholders for the feature until DB query is added */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-mono text-xs">history_depth</span>
                                    <span className="text-emerald-400 font-bold max-w-[50px] text-right">4.2%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-mono text-xs">route_phase</span>
                                    <span className="text-emerald-400 font-bold max-w-[50px] text-right">2.1%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm border-t border-slate-800/50 pt-3">
                                    <span className="text-slate-400 font-mono text-xs">community_reply</span>
                                    <span className="text-emerald-400 font-bold max-w-[50px] text-right">6.3%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, isError = false }: { title: string, value: string | number, isError?: boolean }) {
    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-slate-800/20 to-transparent blur-xl transition-all opacity-0 group-hover:opacity-100"></div>
            <h3 className="text-sm font-medium text-slate-400 mb-2 relative z-10">{title}</h3>
            <p className={`text-3xl font-bold relative z-10 ${isError ? 'text-rose-400' : 'text-slate-100'}`}>
                {value}
            </p>
        </div>
    );
}
