'use client';
import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export default function HeroBlock() {
    const t = useTranslations('Public.Landing.hero');

    return (
        <section className="relative px-4 py-20 text-center sm:py-24 lg:px-8">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 sm:text-5xl lg:text-6xl">
                {t('title')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
                {t('subtitle')}
            </p>
            <div className="mt-10 flex justify-center gap-4">
                <Link
                    href="/app/onboarding/start"
                    className="rounded-lg bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
                >
                    {t('cta_primary')}
                </Link>
                <Link
                    href="#how-it-works"
                    className="rounded-lg border border-slate-700 bg-transparent px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
                >
                    {t('cta_secondary')}
                </Link>
            </div>
            {/* Social Proof Placeholder */}
            {/* <div className="mt-8 text-xs font-medium text-slate-500 uppercase tracking-widest">
                Trusted by 2,000+ early adopters
            </div> */}
        </section>
    );
}
