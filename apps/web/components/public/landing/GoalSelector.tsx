'use client';
import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

const GOALS = [
    'sleep',
    'energy',
    'digestion',
    'stress',
    'weight',
    'performance'
];

export default function GoalSelector() {
    const t = useTranslations('Public.Landing.goals');

    return (
        <section className="mx-auto max-w-4xl px-4 py-8 text-center sm:py-12">
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl mb-8">
                {t('title')}
            </h2>
            <div className="flex flex-wrapjustify-center gap-3 justify-center">
                {GOALS.map((goal) => (
                    <Link
                        key={goal}
                        href={`/onboarding/start?goal=${goal}`}
                        className="group inline-flex items-center rounded-full border border-slate-700 bg-slate-900/40 px-5 py-2.5 text-sm font-medium text-slate-300 shadow-sm transition-all hover:border-slate-500 hover:bg-slate-800 hover:text-white hover:shadow-md"
                    >
                        <span>{t(goal)}</span>
                        <svg className="ml-2 h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                ))}
            </div>
        </section>
    );
}
