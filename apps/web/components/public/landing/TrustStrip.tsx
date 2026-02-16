'use client';
import { useTranslations } from 'next-intl';

export default function TrustStrip() {
    const t = useTranslations('Public.Landing.trust');

    return (
        <section className="bg-slate-900 px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {t('title')}
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-300">
                    {t('intro')}
                </p>
            </div>
            <figure className="mt-16 text-center">
                {/* SVG/Icon Placeholder */}
                <div className="flex justify-center gap-10 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                    <span>Evidence-Based</span>
                    <span>Community-Driven</span>
                    <span>Long-Term</span>
                </div>
            </figure>
        </section>
    );
}
