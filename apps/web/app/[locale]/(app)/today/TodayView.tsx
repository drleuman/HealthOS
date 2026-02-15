'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

type MinimalMode = {
    enabled: boolean;
    level: 0 | 1 | 2;
    reason?: string;
};

type InstrumentPayload = {
    load?: 'normal' | 'reduced';
    minimalMode?: MinimalMode;
};

type TodayAction = {
    type: string;          // "light" | "delay_caffeine" etc
    minutes?: number;
    window?: string;       // "before_11"
    title?: string;        // opcional si lo pasas
    description?: string;  // opcional si lo pasas
};

type TodayCheck = {
    id: string;
    type: string;          // "single_choice" | "scale" etc
    question?: string;
    options?: string[];
};

type TodayPayload = {
    day?: number;
    // tasks: string[]; // Deprecated
    actions?: TodayAction[]; // Now returning full objects
    check?: TodayCheck;      // Now returning single object or null
    message?: { neutral: string; calibration?: string }; // System message object
    biological_phase?: string;
    instrument?: InstrumentPayload;
    program_id?: string;
    community_group?: string;
};

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

function StatusHeader({
    instrument,
    day,
}: {
    instrument?: InstrumentPayload;
    day?: number;
}) {
    const t = useTranslations('App.Today');

    const load = instrument?.load ?? 'normal';
    const loadLabel = load === 'reduced' ? t('load_reduced') : t('load_normal');

    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="text-sm text-slate-400">{t('instrument')}</div>
                <div className="mt-1 text-xl font-semibold tracking-tight text-slate-100">
                    {t('title')}
                </div>
                {typeof day === 'number' ? (
                    <div className="mt-1 text-sm text-slate-400">
                        {t('day_label', { day })}
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col items-end gap-2">
                <Pill>{t('load_label', { value: loadLabel })}</Pill>
                {instrument?.minimalMode?.enabled ? (
                    <Pill>
                        {t('minimal_active', {
                            level: instrument.minimalMode.level,
                        })}
                    </Pill>
                ) : (
                    <Pill>{t('minimal_inactive')}</Pill>
                )}
            </div>
        </div>
    );
}

function SystemMessage({ message }: { message?: { neutral: string; calibration?: string } }) {
    const t = useTranslations('App.Today');
    const text = message?.neutral?.trim() || t('no_message');

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">
                {t('system_message')}
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
    const t = useTranslations('App.Today');
    const [busy, setBusy] = useState(false);

    const label = action.title || t(`actions.${action.type}.title`, { fallback: action.type });
    const desc =
        action.description ||
        t(`actions.${action.type}.desc`, { fallback: '' });

    const metaParts: string[] = [];
    if (typeof action.minutes === 'number') metaParts.push(t('minutes', { m: action.minutes }));
    if (action.window) metaParts.push(t(`windows.${action.window}`, { fallback: action.window }));

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
                    "shrink-0 rounded-lg border px-3 py-2 text-sm",
                    "border-slate-700 bg-transparent text-slate-200",
                    "hover:bg-slate-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                ].join(' ')}
            >
                {busy ? t('transmitting') : t('record')}
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
                <ActionRow key={`${a.type}-${idx}`} action={a} onRecord={onRecord} />
            ))}
        </div>
    );
}

function CheckBlock({
    check,
    onSubmit,
}: {
    check?: TodayCheck;
    onSubmit: (payload: { checkId: string; value: any }) => Promise<void>;
}) {
    const t = useTranslations('App.Today');
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

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">
                {t('check')}
            </div>

            <div className="mt-2 text-sm text-slate-200">
                {check.question || t(`checks.${check.id}.question`, { fallback: t('check_default_question') })}
            </div>

            <div className="mt-3 flex flex-col gap-2">
                {/* MVP: input simple (si tienes options, usa radios) */}
                {Array.isArray(check.options) && check.options.length ? (
                    <div className="space-y-2">
                        {check.options.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm text-slate-300">
                                <input
                                    type="radio"
                                    name={`check-${check.id}`}
                                    value={opt}
                                    checked={value === opt}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="accent-slate-200"
                                />
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={t('check_placeholder')}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-slate-500"
                    />
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={busy || !value}
                    className="mt-1 inline-flex w-fit items-center rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/50 disabled:opacity-50"
                >
                    {busy ? t('transmitting') : t('submit_check')}
                </button>
            </div>
        </div>
    );
}

function TechnicalAccordion({ data }: { data: any }) {
    const t = useTranslations('App.Today');
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950/30">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
                <div className="text-sm text-slate-300">{t('technical_details')}</div>
                <div className="text-xs text-slate-500">{open ? t('collapse') : t('expand')}</div>
            </button>

            {open ? (
                <div className="border-t border-slate-800 px-4 py-3">
                    <pre className="whitespace-pre-wrap break-words text-xs text-slate-400">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            ) : null}
        </div>
    );
}

export default function TodayView() {
    const t = useTranslations('App.Today');
    const locale = useLocale(); // Fix: Import useLocale
    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<TodayPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<TodayPayload>('/today');
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

    const actions = payload?.actions ?? [];
    const check = payload?.check;

    async function recordAction(action: TodayAction) {
        await api.post('/user/day-log', { actionType: action.type, ts: new Date().toISOString() });
        // Set confirmation flag for History view
        localStorage.setItem('healthos_last_recorded_at', new Date().toISOString());
        // Redirect to History for "neutral confirmation" by observation
        router.push(`/${locale}/app/history`);
    }

    async function submitCheck(p: { checkId: string; value: any }) {
        await api.post('/user/day-log', { checkId: p.checkId, value: p.value });
        // Set confirmation flag for History view
        localStorage.setItem('healthos_last_recorded_at', new Date().toISOString());
        // Redirect to History
        router.push(`/${locale}/app/history`);
    }

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
            <div className="space-y-4">
                <StatusHeader instrument={payload?.instrument} day={payload?.day} />

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
                            <SystemMessage message={payload?.message} />

                            <div className="space-y-2">
                                <div className="text-xs uppercase tracking-wide text-slate-500">
                                    {t('actions')}
                                </div>
                                <ActionList actions={actions} onRecord={recordAction} />
                            </div>

                            <CheckBlock check={check} onSubmit={submitCheck} />

                            <TechnicalAccordion
                                data={{
                                    instrument: payload?.instrument,
                                    day: payload?.day,
                                    actionsCount: actions.length,
                                    check: check ? { id: check.id, type: check.type } : null,
                                }}
                            />
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
