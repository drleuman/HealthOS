import React from 'react';
import { useTranslations } from 'next-intl';
import { useExperiment } from '@/lib/experiments';
import { api } from '@/lib/api';

export function Paywall({ onUpgrade }: { onUpgrade?: () => void }) {
    const t = useTranslations('App.Paywall');
    const { variant: trialVariant, loading: trialLoading } = useExperiment('trial_length');
    const { variant: headlineVariant, loading: headlineLoading } = useExperiment('paywall_headline');

    React.useEffect(() => {
        if (!trialLoading && !headlineLoading) {
            api.trackEvent('paywall_viewed', {
                trial_variant: trialVariant,
                headline_variant: headlineVariant
            });
        }
    }, [trialLoading, headlineLoading, trialVariant, headlineVariant]);

    const trialDays = trialVariant === 'v3' ? 3 : trialVariant === 'v5' ? 5 : 7;

    const handleUpgrade = () => {
        api.trackEvent('paywall_cta_clicked', {
            trial_variant: trialVariant,
            headline_variant: headlineVariant,
            days: trialDays
        });
        onUpgrade?.();
    };

    if (trialLoading || headlineLoading) return null;

    const getHeadline = () => {
        if (headlineVariant === 'emotional') return t('title_emotional');
        return t('title');
    };

    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
            {/* ... */}
            <div className="relative z-10 text-center">
                {/* ... */}
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {getHeadline()}
                </h2>
                <p className="mx-auto mt-4 max-w-sm text-slate-400">
                    {t('description', { days: trialDays })}
                </p>

                {/* Social Proof */}
                <div className="flex flex-col items-center gap-1">
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                        <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs font-medium text-secondary">{t('social_proof')}</p>
                    <blockquote className="mt-4 px-6 text-center italic text-sm text-secondary border-l-2 border-indigo-500/30 bg-indigo-500/5 py-3 rounded-r-xl max-w-xs mx-auto">
                        {t('testimonial')}
                    </blockquote>
                </div>

                <div className="mt-10 grid gap-4">
                    <button
                        onClick={handleUpgrade}
                        className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <span>{t('cta', { days: trialDays })}</span>
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>

                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                        {t('cancel_anytime')}
                    </p>
                </div>

                <div className="mt-10 border-t border-slate-800/50 pt-8">
                    <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mb-6">{t('whats_included')}</p>
                    <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                        {[
                            { icon: 'M5 13l4 4L19 7', label: t('feature_1') },
                            { icon: 'M5 13l4 4L19 7', label: t('feature_2') },
                            { icon: 'M5 13l4 4L19 7', label: t('feature_3') },
                            { icon: 'M5 13l4 4L19 7', label: t('feature_4') },
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                                    </svg>
                                </div>
                                <span className="text-xs text-slate-300">{feature.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
