'use client';
import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function HeroBlock() {
    const t = useTranslations('Public.Landing.hero');
    const { trackEvent } = useAnalytics();

    return (
        <section className="relative px-4 py-20 text-center sm:py-28 lg:px-8">
            {/* Badge */}
            <div className="mb-6 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 tracking-wide uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" aria-hidden="true" />
                    {t('badge')}
                </span>
            </div>

            {/* Headline */}
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-100 sm:text-5xl lg:text-6xl leading-tight">
                {t('title')}
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
                {t('subtitle')}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <Link
                    id="hero-cta-primary"
                    href="/app/onboarding/start"
                    onClick={() => trackEvent('landing_cta_click', { button: 'hero_primary' })}
                    className="rounded-lg bg-slate-100 px-6 py-3.5 text-sm font-semibold text-slate-900 transition-all hover:bg-white hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
                >
                    {t('cta_primary')}
                </Link>
                <Link
                    id="hero-cta-secondary"
                    href="#how-it-works"
                    onClick={() => trackEvent('landing_cta_click', { button: 'hero_secondary' })}
                    className="rounded-lg border border-slate-700 bg-transparent px-6 py-3.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800 hover:border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                >
                    {t('cta_secondary')}
                </Link>
            </div>

            {/* P1: Microcopy de confianza */}
            <p className="mt-4 text-xs text-slate-500 font-medium">
                {t('trust_line')}
            </p>
        </section>
    );
}
