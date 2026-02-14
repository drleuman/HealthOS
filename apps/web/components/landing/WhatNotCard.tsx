'use client';

import { useTranslations } from 'next-intl';

export function WhatNotCard() {
    const t = useTranslations('Public.Landing');

    return (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/20 p-8 sm:p-12 lg:p-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Left: Explanation */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold text-slate-50 tracking-tight">
                            {t('anti_title')}
                        </h2>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            No somos otra app de "biohacking" o productividad. HealthOS elimina el ruido para que puedas concentrarte en la señal real de tu cuerpo.
                        </p>
                    </div>

                    {/* Right: List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                            t('anti_1'),
                            t('anti_2'),
                            t('anti_3'),
                            t('anti_4')
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 text-slate-400">
                                <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 text-sm font-bold">✕</div>
                                <span className="text-sm font-medium">{item}</span>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
}
