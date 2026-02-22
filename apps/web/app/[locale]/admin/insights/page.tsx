'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

const ChartBarIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125C16.5 3.504 17.004 3 17.625 3h2.25c.621 0 1.125.504 1.125 1.125V19.875c0 .621-.504 1.125-1.125 1.125h-2.25c-.621 0-1.125-.504-1.125-1.125V4.125z" />
    </svg>
);

const ShieldCheckIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
    </svg>
);

const ArrowPathIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-8 h-8"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0V9.75m-5.007 0V9.75m5.007 0a3 3 0 01-3-3m-3 3a3 3 0 003-3m1.242 2.191l-.894.894a1.5 1.5 0 01-2.122 0l-.894-.894m5.13-3.007a3 3 0 11-5.13 0M15 5.25h.008v.008H15V5.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const ArrowTrendingUpIcon = ({ className }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
);

export default function AdminInsightsPage() {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');

    const fetchData = async () => {
        try {
            const data = await api.adminInsights(period);
            setInsights(data);
        } catch (err) {
            console.error('Failed to fetch insights', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">HealthOS Intelligence</h1>
                        <p className="text-gray-500 mt-1">Autonomous monitoring, anomaly detection, and growth insights.</p>
                    </div>
                    <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-200">
                        {['24h', '7d', '30d'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${period === p
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {p === '24h' ? 'Last 24h' : p === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Column 1: Growth Intelligence */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Summary Widget */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-green-100 p-2 rounded-lg">
                                        <TrophyIcon className="h-6 w-6 text-green-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900">Conversion Attribution</h2>
                                </div>
                                <span className="text-sm font-medium text-gray-400">Total: {insights?.growth?.total || 0} conversions</span>
                            </div>

                            <div className="space-y-4">
                                {insights?.growth?.insights?.map((item: any, idx: number) => (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between items-center mb-1 text-sm font-medium">
                                            <span className="text-gray-700 capitalize">{item.feature.replace(/_/g, ' ')}</span>
                                            <span className="text-indigo-600">{item.rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-indigo-50">
                                            <div
                                                style={{ width: `${item.rate}%` }}
                                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 rounded-full transition-all duration-1000"
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {(!insights?.growth?.insights || insights.growth.insights.length === 0) && (
                                    <div className="text-center py-12 text-gray-400">
                                        <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p>No enough conversion data to generate insights yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Anomalies List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-amber-100 p-2 rounded-lg">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-900">Detected Anomalies (Z-Score &gt; 3)</h2>
                                </div>
                                <button onClick={fetchData} className="text-gray-400 hover:text-indigo-600">
                                    <ArrowPathIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">Timestamp</th>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3">Metric</th>
                                            <th className="px-6 py-3 text-right">Value</th>
                                            <th className="px-6 py-3 text-right">Baseline (Mean)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {insights?.anomalies?.map((anom: any) => (
                                            <tr key={anom.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                    {new Date(anom.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${anom.type.includes('spike') ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {anom.type.replace('anomaly_', '').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 font-medium">{anom.metric}</td>
                                                <td className="px-6 py-4 text-right font-mono text-indigo-600 font-semibold">{anom.value.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-gray-400">{anom.baseline.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {(!insights?.anomalies || insights.anomalies.length === 0) && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                                    No anomalies detected in this period. System stable.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Baselines & Risk */}
                    <div className="space-y-8">
                        {/* Baselining Status */}
                        <div className="bg-indigo-900 text-white rounded-2xl shadow-xl shadow-indigo-100 p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="bg-indigo-800 p-2 rounded-lg">
                                    <ChartBarIcon className="h-6 w-6 text-indigo-300" />
                                </div>
                                <h2 className="text-xl font-semibold">Active Baselines</h2>
                            </div>
                            <div className="space-y-4">
                                {insights?.baselines?.map((bl: any, idx: number) => (
                                    <div key={idx} className="border-b border-indigo-800 pb-3 last:border-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-medium text-indigo-200 truncate pr-2" title={bl.name}>{bl.name}</span>
                                            <span className="text-xs text-indigo-400 shrink-0">StdDev: {bl.stdDev.toFixed(2)}</span>
                                        </div>
                                        <div className="text-lg font-mono font-bold">{bl.mean.toFixed(3)} avg</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex items-center text-xs text-indigo-400">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                <span>Recalculated every hour based on a 7-day window.</span>
                            </div>
                        </div>

                        {/* Security & Risk Insights */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="bg-gray-100 p-2 rounded-lg">
                                    <ShieldCheckIcon className="h-6 w-6 text-gray-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Risk Signals</h2>
                            </div>
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Abuse Score</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="h-3 w-3/4 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-[5%]"></div>
                                        </div>
                                        <span className="text-sm font-bold text-green-600">Low</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Churn Probability</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="h-3 w-3/4 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-400 w-[15%]"></div>
                                        </div>
                                        <span className="text-sm font-bold text-amber-600">Stable</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
