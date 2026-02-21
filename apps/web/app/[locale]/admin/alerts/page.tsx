'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';

export default function AdminAlerts() {
    const t = useTranslations('App.Admin.alerts');
    const { locale } = useParams();

    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');
    const [severity, setSeverity] = useState('');
    const [type, setType] = useState('');

    useEffect(() => {
        setLoading(true);
        api.adminAlerts({ period, severity, type, limit: 100 })
            .then(res => setAlerts(res || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [period, severity, type]);

    const getSeverityColor = (sev: string) => {
        if (sev === 'critical') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        if (sev === 'warn') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">{t('title')}</h1>
                    <p className="text-sm text-slate-400">{t('description')}</p>
                </div>
                {/* Filters */}
                <div className="flex gap-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition-colors"
                    >
                        <option value="24h">24h</option>
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                    </select>

                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition-colors"
                    >
                        <option value="">All Severities</option>
                        <option value="critical">{t('critical')}</option>
                        <option value="warn">{t('warn')}</option>
                        <option value="info">{t('info')}</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="animate-pulse flex space-x-4 mt-8">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-800 rounded"></div>
                            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 mt-8">
                    <p className="text-slate-400">{t('no_alerts')}</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl mt-8">
                    <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('type')}</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('severity')}</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('message')}</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('meta')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900 divide-y divide-slate-800">
                            {alerts.map((alert) => (
                                <tr key={alert.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {new Intl.DateTimeFormat((locale as string) || 'en-US', {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                        }).format(new Date(alert.createdAt))}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100 font-mono">
                                        {alert.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-md border ${getSeverityColor(alert.severity)}`}>
                                            {t(alert.severity) || alert.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300 max-w-md truncate" title={alert.message}>
                                        {alert.message}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400 font-mono max-w-xs truncate" title={JSON.stringify(alert.meta || {})}>
                                        {JSON.stringify(alert.meta || {})}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
