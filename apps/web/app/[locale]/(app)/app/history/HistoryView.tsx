'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type HistoryItem = {
    id: string;
    ts: string; // ISO
    day?: number;
    actionType?: string;
    checkId?: string;
    value?: any;
};

type HistoryPayload = {
    items: HistoryItem[];
    lastRecordedAt?: string; // ISO (opcional si lo devuelves)
};

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 shadow-sm">
            {children}
        </div>
    );
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-[11px] text-slate-300">
            {children}
        </span>
    );
}

function fmtRelative(iso: string) {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const min = Math.round(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min}m`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h}h`;
    const days = Math.round(h / 24);
    return `hace ${days}d`;
}

function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function ItemLabel({ item }: { item: HistoryItem }) {
    const t = useTranslations('App.History');

    if (item.actionType) return <span>{t(`actions.${item.actionType}`, { fallback: item.actionType })}</span>;
    if (item.checkId) return <span>{t(`checks.${item.checkId}`, { fallback: item.checkId })}</span>;
    return <span>{t('unknown')}</span>;
}

export default function HistoryView() {
    const t = useTranslations('App.History');
    const router = useRouter();
    const locale = useLocale();

    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<HistoryPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'7d' | '30d' | 'all'>('7d');

    const filteredItems = useMemo(() => {
        if (!payload?.items) return [];
        if (filter === 'all') return payload.items;

        const now = Date.now();
        const days = filter === '7d' ? 7 : 30;
        const limit = now - (days * 24 * 60 * 60 * 1000);

        return payload.items.filter(it => new Date(it.ts).getTime() >= limit);
    }, [payload?.items, filter]);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<HistoryPayload>('/user/history');
            setPayload(res);
        } catch (e: any) {
            setError(e?.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const [justRecordedAt, setJustRecordedAt] = useState<string | null>(null);
    useEffect(() => {
        try {
            const key = 'healthos_last_recorded_at';
            const v = localStorage.getItem(key);
            if (v) {
                const ageMin = (Date.now() - new Date(v).getTime()) / 60000;
                if (ageMin <= 10) setJustRecordedAt(v);
                localStorage.removeItem(key);
            }
        } catch { }
    }, []);

    const items = payload?.items ?? [];
    const lastTs = useMemo(() => {
        const p = payload?.lastRecordedAt;
        if (p) return p;
        if (!items.length) return null;
        return items[0]?.ts ?? null;
    }, [payload?.lastRecordedAt, items]);

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm text-slate-400">{t('instrument')}</div>
                        <div className="mt-1 text-xl font-semibold tracking-tight text-slate-100">
                            {t('title')}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                            {lastTs ? t('last_record', { when: fmtRelative(lastTs) }) : t('no_records')}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push(`/${locale}/app/today`)}
                        className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/50"
                    >
                        {t('back_to_today')}
                    </button>
                </div>

                <div className="flex gap-2">
                    {['7d', '30d', 'all'].map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f as any)}
                            className={[
                                "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                                filter === f
                                    ? "border-slate-400 bg-slate-400/10 text-slate-100"
                                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200"
                            ].join(' ')}
                        >
                            {t(`filter_${f}`)}
                        </button>
                    ))}
                </div>

                <Card>
                    {loading ? (
                        <div className="text-sm text-slate-400">{t('loading')}</div>
                    ) : error ? (
                        <div className="space-y-3">
                            <div className="text-sm text-red-300">{t('load_failed')}</div>
                            <button
                                type="button"
                                onClick={load}
                                className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/50"
                            >
                                {t('retry')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Confirmation (neutral) */}
                            {justRecordedAt ? (
                                <div className="rounded-xl bg-slate-500/5 px-4 py-2 text-[11px] text-slate-400 border border-slate-800 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500/40" />
                                    {t('confirm_recorded')} · {fmtTime(justRecordedAt)}
                                </div>
                            ) : null}

                            {/* List */}
                            {filteredItems.length ? (
                                <div className="space-y-2">
                                    {filteredItems.map((it, idx) => {
                                        const isNew = idx === 0 && justRecordedAt;
                                        return (
                                            <div
                                                key={it.id}
                                                className={[
                                                    "flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors",
                                                    isNew ? "border-slate-500 bg-slate-900/30" : "border-slate-800 bg-slate-900/10"
                                                ].join(' ')}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="text-sm font-semibold text-slate-100">
                                                            <ItemLabel item={it} />
                                                        </div>
                                                        {typeof it.day === 'number' ? <Pill>{t('day', { day: it.day })}</Pill> : null}
                                                    </div>

                                                    {it.value != null ? (
                                                        <div className="mt-1.5 text-sm text-slate-400">
                                                            {typeof it.value === 'string' ? it.value : JSON.stringify(it.value)}
                                                        </div>
                                                    ) : null}

                                                    <div className="mt-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                                                        {fmtTime(it.ts)}
                                                    </div>
                                                </div>

                                                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-600 border border-slate-800 px-1.5 py-0.5 rounded bg-slate-950/20">
                                                    {t('observed')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 text-center">
                                    <div className="text-sm font-medium text-slate-300">{t('empty_title')}</div>
                                    <div className="mt-1 text-xs text-slate-500">{t('empty_body')}</div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                <div className="text-xs text-slate-600">
                    {t('footer')}
                </div>
            </div>
        </div>
    );
}
