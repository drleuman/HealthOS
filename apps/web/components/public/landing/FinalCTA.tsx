'use client';
import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function FinalCTA() {
    const t = useTranslations('Public.Landing.final');
    const { trackEvent } = useAnalytics();

    return (
        <section className="bg-slate-900 px-6 py-24 sm:py-32 lg:px-8 border-t border-slate-800">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {t('title')}
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
                    {t('subtitle')}
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        href="/app/onboarding/start"
                        onClick={() => trackEvent('landing_cta_click', { button: 'final_primary' })}
                        className="rounded-lg bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        {t('cta_primary')}
                    </Link>
                    <Link
                        href="/app/today"
                        onClick={() => trackEvent('landing_cta_click', { button: 'final_secondary' })}
                        className="text-sm font-semibold leading-6 text-white hover:underline"
                    >
                        {t('cta_secondary')} <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
