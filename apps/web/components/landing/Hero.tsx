'use client';

import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function Hero() {
    const t = useTranslations('Public.Landing');

    return (
        <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                {/* Left Column: Copy & Actions (Col 1-7) */}
                <div className="lg:col-span-7 flex flex-col gap-6 sm:gap-8">

                    {/* Kicker */}
                    <div className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                        {t('hero_kicker')}
                    </div>

                    {/* Headlines */}
                    <div className="space-y-4 sm:space-y-6">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-50 leading-[1.1]">
                            {t('hero_title')}
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
                            {t('hero_subtitle')}
                        </p>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <Link href="/learn" className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-slate-100 text-slate-950 font-bold hover:bg-white transition-all shadow-lg shadow-slate-950/20">
                            {t('hero_cta_explore')}
                        </Link>
                        <Link href="/auth" className="inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-slate-700 bg-slate-900/50 text-slate-300 font-medium hover:border-slate-500 hover:text-slate-50 transition-colors backdrop-blur-sm">
                            {t('hero_cta_register')}
                        </Link>
                    </div>

                    {/* Micro Trust Strip */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                            {t('trust_gamification')}
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                            {t('trust_optional')}
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                            {t('trust_data')}
                        </span>
                    </div>
                </div>

                {/* Right Column: Product Preview (Col 8-12) */}
                <div className="lg:col-span-5 w-full mt-8 lg:mt-0">
                    <div className="relative w-full aspect-[4/3] rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden shadow-2xl">
                        {/* Header Mini */}
                        <div className="absolute top-0 inset-x-0 h-8 bg-slate-900/80 border-b border-slate-800 flex items-center px-3 gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                            <div className="ml-2 text-[10px] text-slate-500 uppercase tracking-wider font-mono">{t('preview_header')}</div>
                        </div>

                        {/* Abstract UI Content */}
                        <div className="absolute inset-x-0 top-8 bottom-8 p-4 flex items-center justify-center">
                            {/* Abstract Timeline Visual */}
                            <div className="relative w-full max-w-[80%] h-2 bg-slate-800 rounded-full">
                                <div className="absolute top-1/2 left-[20%] -translate-y-1/2 w-3 h-3 bg-slate-600 rounded-full border-2 border-slate-900"></div>
                                <div className="absolute top-1/2 left-[50%] -translate-y-1/2 w-4 h-4 bg-sky-500 rounded-full shadow-[0_0_12px_rgba(14,165,233,0.5)] border-2 border-slate-900 z-10"></div>
                                <div className="absolute top-1/2 left-[80%] -translate-y-1/2 w-3 h-3 bg-slate-600 rounded-full border-2 border-slate-900"></div>
                            </div>
                        </div>

                        {/* Footer Meta */}
                        <div className="absolute bottom-0 inset-x-0 h-8 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center">
                            <span className="text-[10px] text-slate-500 font-mono">{t('preview_footer')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
