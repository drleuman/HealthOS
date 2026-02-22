'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

const BeakerIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v1.244c0 .892-.722 1.615-1.615 1.615H6.26l-1.01 10.106a4.5 4.5 0 004.474 4.93h4.552a4.5 4.5 0 004.474-4.93l-1.01-10.106h-1.875c-.893 0-1.615-.723-1.615-1.615V3.104m-4.5 0h4.5" />
    </svg>
);

const UserGroupIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

export default function AdminExperimentsPage() {
    const t = useTranslations('App.Admin');
    const [experiments, setExperiments] = useState<any[]>([]);
    const [selectedExp, setSelectedExp] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const data = await api.getAdminExperiments();
                setExperiments(data);
                if (data.length > 0) {
                    const firstResult = await api.getAdminExperimentResult(data[0].key);
                    setSelectedExp(firstResult);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleSelect = async (key: string) => {
        try {
            const result = await api.getAdminExperimentResult(key);
            setSelectedExp(result);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading && experiments.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-4 border-slate-800 border-t-sky-500 animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Experimentation</h1>
                <p className="text-slate-400 mt-1">Product Validation & A/B Testing Engine</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Experiments List */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">Active Tests</h2>
                    {experiments.length === 0 ? (
                        <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl text-center">
                            <BeakerIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400">No active experiments found.</p>
                        </div>
                    ) : (
                        experiments.map((exp) => (
                            <button
                                key={exp.id}
                                onClick={() => handleSelect(exp.key)}
                                className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedExp?.key === exp.key ? 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/10' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${exp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                        {exp.status}
                                    </span>
                                    <span className="text-xs text-slate-500">{new Date(exp.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-bold text-white mb-1">{exp.key}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2">{exp.description || 'No description provided.'}</p>
                                <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <UserGroupIcon className="w-4 h-4" />
                                        {exp._count?.assignments || 0} participants
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Experiment Details / Stats */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedExp ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                        <BeakerIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{selectedExp.key}</h2>
                                        <p className="text-slate-400">Conversion Impact Analysis</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                {selectedExp.results.map((res: any, idx: number) => (
                                    <div key={res.variant} className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-6 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:opacity-10 transition-opacity">
                                            <BeakerIcon className="w-16 h-16" />
                                        </div>
                                        <div className="relative">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{res.variant}</span>
                                            <div className="text-3xl font-bold text-white mt-1">{res.conversionRate.toFixed(1)}%</div>
                                            <p className="text-xs text-slate-400 mt-1">CR ({res.conversions} / {res.assignments})</p>
                                        </div>
                                        <div className="mt-6 h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${idx === 0 ? 'bg-slate-500' : 'bg-sky-500'}`}
                                                style={{ width: `${res.conversionRate}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Lift analysis placeholder */}
                            <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">Projected Lift: +12.4%</h4>
                                        <p className="text-sm text-slate-400 italic">Confidence interval: 95% (p=0.042)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl text-slate-500">
                            <BeakerIcon className="w-20 h-20 mb-4 opacity-20" />
                            <p>Select an experiment to view results</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
