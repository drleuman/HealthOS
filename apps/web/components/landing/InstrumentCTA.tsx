'use client';

import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function InstrumentCTA() {
    const t = useTranslations('Public.Landing');

    return (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18 pb-24">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 sm:p-12 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-900/10 to-transparent pointer-events-none"></div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 w-full">

                    {/* Left: Text (Col 1-8) */}
                    <div className="lg:col-span-8 space-y-4">
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">
                            {t('instrument_title')}
                        </h2>
                        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
                            {t('instrument_desc')}
                        </p>
                    </div>

                    {/* Right: Box CTA (Col 9-12) */}
                    <div className="lg:col-span-4 w-full">
                        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4 shadow-xl">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Instrumento v1.0</div>
                            <p className="text-sm text-slate-300">Acceso beta disponible.</p>
                            <Link
                                href="/auth"
                                className="block w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors shadow-lg shadow-sky-900/20"
                            >
                                {t('instrument_cta')}
                            </Link>
                            <div className="pt-2">
                                <Link href="/learn" className="text-xs text-slate-500 hover:text-slate-300 underline decoration-slate-700 underline-offset-4 transition-colors">
                                    {t('instrument_link_secondary')}
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
