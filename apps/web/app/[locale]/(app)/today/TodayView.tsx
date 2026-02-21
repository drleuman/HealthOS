'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


type TodayAction = {
    id: string;
    labelKey?: string;     // New i18n key
    label?: string;        // Fallback/Legacy
    type: string;          // "light" | "delay_caffeine" etc
    status?: 'pending' | 'completed';
    minutes?: number;
    window?: string;       // "before_11"
    title?: string;        // fallback
    description?: string;  // fallback
};

type TodayCheck = {
    id: string;
    type?: string;          // "single_choice" | "scale" etc
    prompt?: string;
    question?: string;
    labelKey?: string;      // New i18n key
    options?: Array<{ id: string; label?: string; labelKey?: string }> | string[];
};

type TodayResource = {
    slug?: string;
    threadId?: string;
    titleKey: string;
    whyKey: string;
    type: 'blog' | 'recipe' | 'product' | 'course' | 'community';
    tags?: string[];
};

type MinimalMode = {
    enabled: boolean;
    level: 0 | 1 | 2;
    reason?: string;
};

// Start strict contract types locally (mirroring shared)
type TodayPayload = {
    uiMode: 'PROTOCOL' | 'OBSERVATION' | 'RECALIBRATION';
    status: 'ACTIVE' | 'COMPLETED';
    protocolId?: string;
    day?: number;
    systemMessage: {
        i18nKey: string;
        params?: any;
        selectedRuleId?: string;
        reason?: any;
    };
    behavior: {
        deviation?: {
            active: boolean;
            type: string;
            severity?: number;
        } | null;
        reentry: {
            eligible: boolean;
            cooldownUntil?: string | null;
        };
        recalibration: {
            status: 'NONE' | 'OFFERED' | 'ACTIVE';
        };
        minimalMode?: MinimalMode | null;
    };
    protocol?: {
        actions: TodayAction[];
        check?: TodayCheck;
        learn?: any;
        progress?: number;
    };
    community: {
        threads: any[];
        primaryThreadId?: string | null;
    };
    // Legacy mapping helpers if needed
    instrument?: any;
    message?: any; // legacy fallback
};

function ResourceIcon({ type }: { type: string }) {
    switch (type) {
        case 'blog':
            return (
                <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
            );
        case 'recipe':
            return (
                <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v1.607a2 2 0 01-.778 1.584l-1.921 1.44a2 2 0 00-.778 1.584v4.631a2 2 0 00.778 1.584l1.921 1.44a2 2 0 01.778 1.584v1.607m1.235-14.7l.397.033A2 2 0 0113 4.981v4.917a2 2 0 00.765 1.569l1.917 1.477a2 2 0 01.765 1.569v3.424m-1.235 5.4l-.397-.033A2 2 0 0111 20.02v-4.917a2 2 0 00-.765-1.569l-1.917-1.477a2 2 0 01-.765-1.569v-3.424m10.222-1.355a2 2 0 01-1.127.304H18.06a2 2 0 00-1.492.674l-1.5 1.74a2 2 0 00-.432.784l-.873 2.91a2 2 0 01-.944 1.173L11 20" />
                </svg>
            );
        case 'product':
            return (
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
            );
        case 'community':
            return (
                <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
            );
        default:
            return (
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
            );
    }
}

function ResourcesBlock({ resources }: { resources?: TodayResource[] }) {
    const t = useTranslations();
    const t_today = useTranslations('App.Today');
    const locale = useLocale();

    if (!resources || resources.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="border-t border-slate-800 pt-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                    {t_today('resources_title')}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                    {t_today('resources_subtitle')}
                </div>
            </div>

            <div className="space-y-2">
                {resources.map((res, idx) => {
                    const title = t(res.titleKey);
                    const why = t(res.whyKey);

                    let href = `/${locale}/learn/${res.slug || ''}`;
                    if (res.type === 'blog') href = `/${locale}/blog/${res.slug || ''}`;
                    if (res.type === 'community') href = `/${locale}/community${res.threadId ? `/thread/${res.threadId}` : ''}`;
                    if (res.type === 'product') href = `/${locale}/products/${res.slug || ''}`;
                    if (res.type === 'course') href = `/${locale}/courses/${res.slug || ''}`;

                    return (
                        <div key={idx} className="group relative flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/10 p-4 transition-colors hover:bg-slate-900/20">
                            <div className="flex gap-3 min-w-0">
                                <div className="mt-1 shrink-0">
                                    <ResourceIcon type={res.type} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-100">{title}</div>
                                    <div className="mt-1 text-xs text-slate-400 leading-relaxed">{why}</div>
                                    {res.type === 'product' && (
                                        <div className="mt-2">
                                            <span className="inline-flex items-center rounded-full bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[9px] uppercase font-bold text-slate-300 tracking-wider">
                                                {t_today('optional_tool_label')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Link
                                href={href}
                                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800/40 hover:border-slate-600"
                            >
                                {t_today('view_resource')}
                                <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    );
                })}
            </div>

            {resources.some(r => r.type === 'community') && (
                <div className="mt-4 border-t border-slate-800 pt-3">
                    <Link
                        href={`/${locale}/community?scope=program_day`}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                    >
                        {t_today('view_all_community')}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            )}
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

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 shadow-sm">
            {children}
        </div>
    );
}

function ReentryOfferCard({
    reentry,
    onDecision
}: {
    reentry?: { eligible: boolean; type?: string; planId?: string } | null;
    onDecision: (decision: 'ACCEPT' | 'DECLINE') => Promise<void>;
}) {
    const t = useTranslations('App.Reentry');
    const [busy, setBusy] = useState(false);

    if (!reentry?.eligible) return null;

    async function handle(decision: 'ACCEPT' | 'DECLINE') {
        if (busy) return;
        setBusy(true);
        try {
            await onDecision(decision);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="relative overflow-hidden rounded-xl border border-amber-900/30 bg-gradient-to-br from-amber-500/10 to-transparent p-4">
            <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-400">{t('title')}</h3>
                    <p className="mt-1 text-xs text-amber-200/70 leading-relaxed">
                        {t('body')}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            onClick={() => handle('ACCEPT')}
                            disabled={busy}
                            className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-900 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50"
                        >
                            <span>{t('start_recalibration')}</span>
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handle('DECLINE')}
                            disabled={busy}
                            className="rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:border-slate-600 hover:text-slate-300 disabled:opacity-50"
                        >
                            {t('keep_observing')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ObservationStatusCard({ message }: { message?: any }) {
    const t = useTranslations('App.Observation');
    return (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/10 p-4">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {t('title')}
                </div>
            </div>
            {message && (
                <p className="mt-3 text-sm text-slate-400 leading-relaxed italic">
                    {message}
                </p>
            )}
        </div>
    );
}

function StatusHeader({
    behavior,
    day,
    status,
    uiMode
}: {
    behavior?: any;
    day?: number;
    status?: string;
    uiMode?: string;
}) {
    const t = useTranslations('App.Today');

    // Mapped from behavior or defaults
    const load = 'normal'; // MVP default as it wasn't strictly in new contract yet
    const loadLabel = t('load_normal');
    const minimalMode = behavior?.minimalMode;

    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t('instrument')}</div>
                <div className="mt-1 text-xl font-semibold tracking-tight text-slate-100 flex items-center gap-2">
                    {t('title')}
                </div>
                {uiMode === 'PROTOCOL' && typeof day === 'number' && (
                    <div className="mt-1 text-sm text-slate-400">
                        {t('day_label', { day })}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-end gap-2">
                {/* <Pill>{t('load_label', { value: loadLabel })}</Pill> */}
                {minimalMode ? (
                    <Pill>
                        {t('minimal_active', {
                            level: minimalMode.level || 1,
                        })}
                    </Pill>
                ) : (
                    <Pill>{t('minimal_inactive')}</Pill>
                )}
            </div>
        </div>
    );
}

function SystemMessage({ message }: { message?: { i18nKey: string; params?: any } }) {
    const t = useTranslations();
    const t_today = useTranslations('App.Today');

    const text = message?.i18nKey ? t(message.i18nKey, message.params || {}) : t_today('no_message');

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">
                {t_today('system_message')}
            </div>
            <div className="mt-1 text-sm leading-relaxed text-slate-200">{text}</div>
        </div>
    );
}

function ActionRow({
    action,
    onRecord,
    disabled,
}: {
    action: TodayAction;
    onRecord: (action: TodayAction) => Promise<void>;
    disabled?: boolean;
}) {
    const t = useTranslations();
    const t_today = useTranslations('App.Today');
    const [busy, setBusy] = useState(false);

    // New UPG format uses action.label as an i18n key or fallback
    const label = action.label ? t(action.label) : t_today(`actions.${action.type}.title`, { fallback: action.type });
    const desc = action.description || t_today(`actions.${action.type}.desc`, { fallback: '' });

    const metaParts: string[] = [];
    if (typeof action.minutes === 'number') metaParts.push(t_today('minutes', { m: action.minutes }));
    if (action.window) metaParts.push(t_today(`windows.${action.window}`, { fallback: action.window }));

    const meta = metaParts.filter(Boolean).join(' · ');

    async function handleClick() {
        if (busy || disabled) return;
        setBusy(true);
        try {
            await onRecord(action);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/20 p-3">
            <div className="min-w-0">
                <div className="text-sm font-medium text-slate-100">{label}</div>
                {desc ? <div className="mt-1 text-sm text-slate-400">{desc}</div> : null}
                {meta ? <div className="mt-2 text-xs text-slate-500">{meta}</div> : null}
            </div>

            <button
                type="button"
                onClick={handleClick}
                disabled={disabled || busy}
                className={[
                    "shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm",
                    "border-slate-700 bg-transparent text-slate-200",
                    "hover:bg-slate-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                ].join(' ')}
            >
                {busy ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                )}
                <span>{busy ? t_today('transmitting') : t_today('record')}</span>
            </button>
        </div>
    );
}

function ActionList({
    actions,
    onRecord,
}: {
    actions: TodayAction[];
    onRecord: (action: TodayAction) => Promise<void>;
}) {
    const t = useTranslations('App.Today');

    if (!actions?.length) {
        return (
            <div className="text-sm text-slate-400">
                {t('no_actions')}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {actions.map((a, idx) => (
                <ActionRow key={`${a.type || a.id}-${idx}`} action={a} onRecord={onRecord} />
            ))}
        </div>
    );
}

function LearnBlock({ learn }: { learn: any }) {
    const t = useTranslations();
    const t_today = useTranslations('App.Today');
    const [open, setOpen] = useState(false);

    if (!learn) return null;

    // Support both new strict contract (titleKey) and potential legacy (id as key)
    const title = learn.titleKey ? t(learn.titleKey) : (learn.id ? t(learn.id) : t_today('learn_title'));
    const summary = learn.summaryKey ? t(learn.summaryKey) : (learn.summary ? t(learn.summary) : '');

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/10 p-3">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-center justify-between text-left"
            >
                <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                        {t_today('learn_label')}
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-200">{title}</div>
                </div>
                <div className="text-xs text-slate-500">{open ? t_today('collapse') : t_today('expand')}</div>
            </button>

            {open && summary && (
                <div className="mt-3 text-sm leading-relaxed text-slate-400 border-t border-slate-800 pt-3">
                    {summary}
                </div>
            )}
        </div>
    );
}

function SupportBlock({ support }: { support: any }) {
    const t = useTranslations();
    const t_today = useTranslations('App.Today');

    if (!support) return null;

    return (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-800 pt-4">
            {support.communityGroupKey && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-700"></span>
                    {t_today('community_active')}
                </div>
            )}
            {support.commonQuestionsKey && (
                <button className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 decoration-slate-700">
                    {t(support.commonQuestionsKey)}
                </button>
            )}
        </div>
    );
}

function CheckBlock({
    check,
    onSubmit,
}: {
    check?: TodayCheck & { prompt?: string };
    onSubmit: (payload: { checkId: string; value: any }) => Promise<void>;
}) {
    const t = useTranslations();
    const t_today = useTranslations('App.Today');
    const [value, setValue] = useState<string>('');
    const [busy, setBusy] = useState(false);

    if (!check) return null;

    async function handleSubmit() {
        if (busy || !check) return;
        setBusy(true);
        try {
            await onSubmit({ checkId: check.id, value });
        } finally {
            setBusy(false);
        }
    }

    const question = check.prompt ? t(check.prompt) : (check.question || t_today(`checks.${check.id}.question`, { fallback: t_today('check_default_question') }));

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">
                {t_today('check')}
            </div>

            <div className="mt-2 text-sm text-slate-200">
                {question}
            </div>

            <div className="mt-3 flex flex-col gap-2">
                {Array.isArray(check.options) && check.options.length ? (
                    <div className="space-y-2">
                        {check.options.map((opt: any) => {
                            const optId = typeof opt === 'string' ? opt : opt.id;
                            const optLabel = typeof opt === 'string' ? opt : t(opt.label);
                            return (
                                <label key={optId} className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="radio"
                                        name={`check-${check.id}`}
                                        value={optId}
                                        checked={value === optId}
                                        onChange={(e) => setValue(e.target.value)}
                                        className="accent-slate-200"
                                    />
                                    <span>{optLabel}</span>
                                </label>
                            );
                        })}
                    </div>
                ) : (
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={t_today('check_placeholder')}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-slate-500"
                    />
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={busy || !value}
                    className="mt-1 inline-flex w-fit items-center rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/50 disabled:opacity-50"
                >
                    {busy ? t_today('transmitting') : t_today('submit_check')}
                </button>
            </div>
        </div>
    );
}

function SystemContextPanel({ data }: { data: any }) {
    const t = useTranslations('App.Today');

    return (
        <div className="mt-8 rounded-2xl border border-slate-800/60 bg-slate-900/10 p-4">
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {t('context_title')}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-slate-800/30 p-3 border border-slate-700/30">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Modo</div>
                    <div className="text-sm font-medium text-slate-200">{data.mode === 'OBSERVATION' ? 'Observación' : data.mode === 'PROTOCOL' ? 'Protocolo' : data.mode || 'N/A'}</div>
                </div>
                <div className="rounded-xl bg-slate-800/30 p-3 border border-slate-700/30">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Día</div>
                    <div className="text-sm font-medium text-slate-200">{data.day || '-'}</div>
                </div>
                <div className="rounded-xl bg-slate-800/30 p-3 border border-slate-700/30">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Acciones</div>
                    <div className="text-sm font-medium text-slate-200">{data.actionsCount}</div>
                </div>
                <div className="rounded-xl bg-slate-800/30 p-3 border border-slate-700/30">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Check</div>
                    <div className="text-sm font-medium text-slate-200">{data.check ? 'Requerido' : 'Opcional'}</div>
                </div>
            </div>
        </div>
    );
}

export default function TodayView() {
    const t = useTranslations('App.Today');
    const t_global = useTranslations();
    const locale = useLocale();
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<any>(null); // We use any for avoiding strict type duels locally
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<any>('/today');
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

    const protocol = payload?.protocol;
    const actions = protocol?.actions ?? [];
    const check = protocol?.check;

    async function recordAction(action: any) {
        // Map new action.id/labelKey to generic log
        await api.post('/user/day-log', { actionType: action.id, ts: new Date().toISOString() });
        localStorage.setItem('healthos_last_recorded_at', new Date().toISOString());
        router.push(`/${locale}/app/history`);
    }

    async function submitCheck(p: { checkId: string; value: any }) {
        await api.post('/user/day-log', { checkId: p.checkId, value: p.value });
        localStorage.setItem('healthos_last_recorded_at', new Date().toISOString());
        router.push(`/${locale}/app/history`);
    }

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            <div className="space-y-4">
                <StatusHeader
                    behavior={payload?.behavior}
                    day={payload?.day}
                    status={payload?.status}
                    uiMode={payload?.uiMode}
                />

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
                            <SystemMessage message={payload?.systemMessage} />

                            {payload?.uiMode === 'OBSERVATION' && (
                                <div className="space-y-6">
                                    <ObservationStatusCard
                                        // Pass localized text if deviation active, etc.
                                        message={null}
                                    />
                                    <ReentryOfferCard
                                        reentry={payload?.behavior?.reentry}
                                        onDecision={async (decision) => {
                                            const res = await api.post('/user/reentry/decision', {
                                                decision,
                                                planId: 'recalibration_3d'
                                            }) as any;
                                            if (res.ok && decision === 'ACCEPT') {
                                                router.push(`/${locale}/app/recalibration`);
                                            } else {
                                                load(); // Refresh state
                                            }
                                        }}
                                    />

                                    {/* Community-first for Observation mode: from community.threads */}
                                    {payload?.community?.threads?.length > 0 && (
                                        <div className="pt-2">
                                            {/* We adapt the thread preview to the ResourcesBlock format or similar */}
                                            <div className="space-y-2">
                                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                                    {t('community_active')}
                                                </div>
                                                {payload.community.threads.map((th: any) => (
                                                    <Link
                                                        key={th.id}
                                                        href={`/${locale}/community/thread/${th.id}`}
                                                        className="block rounded-xl border border-slate-800 bg-slate-900/10 p-4 hover:bg-slate-900/20"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-violet-400"></div>
                                                            <div className="text-sm font-semibold text-slate-200">
                                                                {/* Render translated title, falling back to raw key/string */}
                                                                {t_global(th.titleKey)}
                                                            </div>
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500 ml-3.5">
                                                            {th.replyCount} {t('replies_label', { count: th.replyCount, fallback: 'replies' })} · {new Date(th.lastActivityAt).toLocaleDateString()}
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {payload?.uiMode === 'RECALIBRATION' && (
                                <div className="rounded-xl border border-amber-900/30 bg-amber-500/5 p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="h-5 w-5 text-amber-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                        </svg>
                                        <div className="text-xs font-bold uppercase tracking-widest text-amber-500/80">{t('recalibration_active')}</div>
                                    </div>
                                    <p className="mt-2 text-sm text-amber-200/70 leading-relaxed">
                                        {t('recalibration_desc')}
                                    </p>
                                    <button
                                        onClick={() => router.push(`/${locale}/app/recalibration`)}
                                        className="mt-4 w-full rounded-lg bg-amber-500 py-3 text-xs font-bold uppercase tracking-wider text-slate-900 transition-all hover:bg-amber-400"
                                    >
                                        {t('recalibration_cta')}
                                    </button>
                                </div>
                            )}

                            {payload?.uiMode === 'PROTOCOL' && (
                                <>
                                    {payload?.behavior?.minimalMode?.level === 2 && (
                                        <div className="text-xs text-slate-500 italic px-1">
                                            {t('minimal_mode_l2_hint', { fallback: 'Hoy: versión mínima (1 paso).' })}
                                        </div>
                                    )}

                                    <LearnBlock learn={protocol?.learn} />

                                    <div className="space-y-2">
                                        <div className="text-xs uppercase tracking-wide text-slate-500">
                                            {t('actions')}
                                        </div>
                                        <ActionList actions={actions} onRecord={recordAction} />
                                    </div>


                                    {check && <CheckBlock check={check} onSubmit={submitCheck} />}

                                    {/* Community Deep Link */}
                                    {payload?.community?.threadOfDayId && (
                                        <div className="mt-6 border-t border-slate-800/50 pt-4">
                                            <div className="flex items-center justify-between rounded-xl bg-slate-900/20 p-4 transition-colors hover:bg-slate-900/30">
                                                <div>
                                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                        </svg>
                                                        {t('community')}
                                                    </div>
                                                    <div className="mt-1 text-sm font-medium text-slate-300 ml-5.5">
                                                        {t('view_group')}
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/${locale}/community/thread/${payload.community.threadOfDayId}?from=app`}
                                                    className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
                                                >
                                                    {t('open')}
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <SystemContextPanel
                                data={{
                                    mode: payload?.uiMode,
                                    day: payload?.day,
                                    actionsCount: actions.length,
                                    check: check ? { id: check.id } : null,
                                }}
                            />
                        </div>
                    )}
                </Card>

                <div className="text-xs text-slate-600">
                    {t('footer')}
                </div>
            </div >
        </div >
    );
}



