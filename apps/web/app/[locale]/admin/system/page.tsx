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
        api.adminSystem()
            .then(res => {
                if (mounted) setSystemInfo(res);
            })
            .catch(err => {
                console.error(err);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-100">{t('system')}</h1>

            {loading && !systemInfo && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-64 animate-pulse"></div>
            )}

            {!loading && systemInfo && (
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                                Server Status
                            </h2>
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                {systemInfo.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="p-6">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                <div className="border-b border-slate-800/50 pb-3">
                                    <dt className="text-slate-500 mb-1">{t('system_health.version')}</dt>
                                    <dd className="font-mono text-slate-200">{systemInfo.version}</dd>
                                </div>
                                <div className="border-b border-slate-800/50 pb-3">
                                    <dt className="text-slate-500 mb-1">{t('system_health.env')}</dt>
                                    <dd className="font-mono text-slate-200">{systemInfo.nodeEnv}</dd>
                                </div>
                                <div className="border-b border-slate-800/50 pb-3">
                                    <dt className="text-slate-500 mb-1">{t('system_health.origin')}</dt>
                                    <dd className="font-mono text-sky-400 break-all">{systemInfo.appOrigin}</dd>
                                </div>
                                <div className="border-b border-slate-800/50 pb-3">
                                    <dt className="text-slate-500 mb-1">Server Time</dt>
                                    <dd className="font-mono text-slate-200">{new Date(systemInfo.timestamp).toLocaleString()}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {/* Quick actions/tools like flushing cache or running manual jobs */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                        <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <h3 className="text-slate-300 font-medium mb-1">Operations Queue</h3>
                        <p className="text-slate-500 text-sm max-w-sm mb-4">No jobs currently stuck in processing. Rate limits are operating nominally per user.</p>
                        <button disabled className="px-4 py-2 bg-slate-800 text-slate-500 border border-slate-700 rounded-lg text-sm font-medium cursor-not-allowed">
                            Flush System Caches
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
