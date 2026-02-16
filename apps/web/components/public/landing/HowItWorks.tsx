'use client';
import { useTranslations } from 'next-intl';

export default function HowItWorks() {
    const t = useTranslations('Public.Landing.hiw');

    return (
        <section id="how-it-works" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl text-center mb-16">
                {t('title')}
            </h2>
            <div className="grid gap-12 sm:grid-cols-3">
                {['step1', 'step2', 'step3'].map((step, index) => (
                    <div key={step} className="relative flex flex-col gap-4 text-center items-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900/50 border border-slate-700 font-mono text-2xl font-bold text-slate-100 shadow-sm ring-1 ring-slate-800">
                            {index + 1}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-100 mt-2">
                            {t(`${step}.title`)}
                        </h3>
                        <p className="max-w-xs text-base text-slate-400">
                            {t(`${step}.desc`)}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
