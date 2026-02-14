'use client';

import { useTranslations } from 'next-intl';

export function HowItWorksSplit() {
    const t = useTranslations('Public.Landing');

    const steps = [
        { num: 1, label: t('step_1'), meta: "Input" },
        { num: 2, label: t('step_2'), meta: "Action" },
        { num: 3, label: t('step_3'), meta: "Time" },
        { num: 4, label: t('step_4'), meta: "Value" }
    ];

    return (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Left: Narrative (Col 1-6) */}
                <div className="lg:col-span-6 space-y-8">
                    <h2 className="text-3xl font-bold text-slate-50 tracking-tight">
                        {t('narrative_title')}
                    </h2>
                    <p className="text-lg text-slate-300 leading-relaxed">
                        Un ciclo de retroalimentación lento y deliberado. HealthOS no busca tu atención inmediata, sino proporcionarte claridad a largo plazo sobre tus propios sistemas biológicos.
                    </p>
                    <div className="space-y-4 pt-4">
                        {steps.map((s) => (
                            <div key={s.num} className="flex gap-4 items-baseline">
                                <span className="font-mono text-sky-500 font-bold text-lg">0{s.num}.</span>
                                <span className="text-slate-400 text-base">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Flow Diagram Card (Col 7-12) */}
                <div className="lg:col-span-6 w-full">
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 shadow-2xl">
                        <div className="space-y-6 relative">
                            {/* Connecting Line */}
                            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-800 -z-10"></div>

                            {steps.map((s) => (
                                <div key={s.num} className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200 text-sm font-bold shadow-sm">
                                        {s.num}
                                    </div>
                                    <div className="flex-1 p-4 rounded-xl border border-slate-800/50 bg-slate-950/30">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-slate-200 text-sm">{s.label}</span>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-600 font-mono">{s.meta}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}
