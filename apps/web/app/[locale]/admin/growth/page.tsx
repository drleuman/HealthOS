'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

const ArrowTrendingUpIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
);

const UserGroupIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

const BoltIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
);

export default function AdminGrowthPage() {
    const t = useTranslations('App.Admin');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await api.adminGrowth(period);
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [period]);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-4 border-slate-800 border-t-sky-500 animate-spin"></div>
            </div>
        );
    }

    const funnel = stats?.funnel || [];
    const retention = stats?.retention || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t('growth')}</h1>
                    <p className="text-slate-400 mt-1">Activation & Conversion Funnel Analytics</p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
                    {['24h', '7d', '30d'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Funnel Visualization */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <ArrowTrendingUpIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Conversion Funnel</h2>
                </div>

                <div className="space-y-4">
                    {funnel.map((stage: any, index: number) => {
                        const width = stage.count > 0 ? (stage.count / funnel[0].count) * 100 : 0;
                        return (
                            <div key={stage.id} className="relative group">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 border border-slate-700">
                                            {index + 1}
                                        </span>
                                        <span className="font-semibold text-slate-300 group-hover:text-white transition-colors">{stage.label}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-white leading-none">{stage.count}</span>
                                        {index > 0 && (
                                            <span className="ml-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                {stage.rate.toFixed(1)}% CR
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="h-4 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
                                    <div
                                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                                        style={{ width: `${width}%` }}
                                    />
                                </div>
                                {index < funnel.length - 1 && (
                                    <div className="flex justify-center -my-1 relative z-10">
                                        <div className="w-px h-6 bg-gradient-to-b from-slate-700 to-transparent"></div>
                                        <div className="absolute top-1/2 -translate-y-1/2 bg-slate-950 border border-slate-800 rounded-full px-2 py-0.5 text-[10px] font-bold text-rose-400 flex items-center gap-1 shadow-xl">
                                            <span>↓ {stage.drop.toFixed(1)}% drop</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid for Retention and Cohorts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Retention Summary */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <UserGroupIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Retention Benchmarks</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {retention.map((item: any) => (
                            <div key={item.label} className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{item.label}</span>
                                <div className="flex items-end justify-between mt-2">
                                    <div className="text-3xl font-bold text-white">{item.rate.toFixed(1)}%</div>
                                    <div className="text-xs text-slate-500 pb-1">{item.active} / {item.joined} users</div>
                                </div>
                                <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${item.rate}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cohort Retention Heatmap */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <ArrowTrendingUpIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Cohort Retention Heatmap</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                                <th className="pb-3 pr-4 font-medium">Cohort (Week)</th>
                                <th className="pb-3 pr-4 font-medium">Size</th>
                                <th className="pb-3 text-center font-medium">Day 1</th>
                                <th className="pb-3 text-center font-medium">Day 7</th>
                                <th className="pb-3 text-center font-medium">Day 14</th>
                                <th className="pb-3 text-center font-medium">Day 28</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {stats?.cohorts?.map((cohort: any) => (
                                <tr key={cohort.week} className="border-t border-slate-800/50 group">
                                    <td className="py-3 pr-4 font-medium text-slate-300 group-hover:text-white">{cohort.week}</td>
                                    <td className="py-3 pr-4 text-slate-500">{cohort.size}</td>
                                    {[1, 7, 14, 28].map(day => {
                                        const entry = cohort.retention.find((r: any) => r.day === day);
                                        const rate = entry?.rate || 0;
                                        // Dynamic background based on intensity
                                        const opacity = Math.max(0.1, rate / 100);
                                        return (
                                            <td key={day} className="py-1 px-1">
                                                <div
                                                    className="w-full h-8 flex items-center justify-center rounded-md font-bold text-[11px] transition-all"
                                                    style={{
                                                        backgroundColor: rate > 0 ? `rgba(14, 165, 233, ${opacity})` : 'transparent',
                                                        color: rate > 40 ? 'white' : 'rgb(148, 163, 184)',
                                                        border: rate > 0 ? '1px solid rgba(14, 165, 233, 0.2)' : '1px solid rgba(30, 41, 59, 0.5)'
                                                    }}
                                                >
                                                    {rate > 0 ? `${rate.toFixed(0)}%` : '-'}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Evolution of Magic Moments */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <BoltIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Activation Signals</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">Time to Onboarding</span>
                            <span className="text-xs text-slate-500 italic mt-0.5">Registration → Completion</span>
                        </div>
                        <div className="text-lg font-mono font-bold text-sky-400">04:32 min</div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">Magic Moment Rate</span>
                            <span className="text-xs text-slate-500 italic mt-0.5">Signup → First Protocol</span>
                        </div>
                        <div className="text-lg font-mono font-bold text-emerald-400">42.5 %</div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">Churn Risk (Early)</span>
                            <span className="text-xs text-slate-500 italic mt-0.5">Day 1 Drop-off</span>
                        </div>
                        <div className="text-lg font-mono font-bold text-rose-400">58.2 %</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
