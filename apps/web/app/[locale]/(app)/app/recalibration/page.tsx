'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RecalibrationPage() {
    const t = useTranslations('App.Recalibration');
    const t_common = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                // We use /today which now includes recalibration info
                const res = await api.get<any>('/user/today');
                if (res.behavior?.recalibration?.status !== 'ACTIVE') {
                    router.push(`/${locale}/app/today`);
                    return;
                }
                setData(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, [locale, router]);

    if (loading) return <div className="p-8 text-center text-slate-500">...</div>;
    if (!data) return null;

    const recal = data.behavior?.recalibration;
    const protocol = data.protocol; // The engine should serve recalibration_3d content when active

    async function handleLog() {
        setBusy(true);
        try {
            await api.post('/user/day-log', {
                action_completed: true,
                self_report_effect: 'same', // default
                day: recal.dayIndex
            });
            router.push(`/${locale}/app/history`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
            <div className="space-y-6">
                <header>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/80">
                        {t('title')}
                    </div>
                    <h1 className="mt-2 text-xl font-semibold text-slate-100">
                        {t('day_label', { day: recal.dayIndex })}
                    </h1>
                </header>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
                    <div className="space-y-6">
                        {/* Declarative Message */}
                        {data.system_message && (
                            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                                <p className="text-sm text-slate-300 leading-relaxed italic">
                                    "{data.system_message}"
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            {data.actions?.map((action: any) => (
                                <div key={action.type} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500/50">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-slate-200">{action.label}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleLog}
                            disabled={busy}
                            className="w-full rounded-xl bg-slate-100 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-900 transition-all hover:bg-white active:scale-[0.98] disabled:opacity-50"
                        >
                            {busy ? t_common('transmitting') : t('submit')}
                        </button>
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={() => router.push(`/${locale}/app/today`)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                    >
                        {t_common('back_to_today')}
                    </button>
                </div>
            </div>
        </div>
    );
}
