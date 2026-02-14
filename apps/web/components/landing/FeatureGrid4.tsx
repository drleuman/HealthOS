'use client';

import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function FeatureGrid4() {
    const t = useTranslations('Public.Landing');

    const features = [
        {
            icon: "📖",
            title: t('concept_knowledge'),
            desc: t('concept_knowledge_desc'),
            href: "/blog"
        },
        {
            icon: "🎓",
            title: t('concept_education'),
            desc: t('concept_education_desc'),
            href: "/courses"
        },
        {
            icon: "💬",
            title: t('concept_community'),
            desc: t('concept_community_desc'),
            href: "/community"
        },
        {
            icon: "🔬",
            title: t('concept_registry'),
            desc: t('concept_registry_desc'),
            href: "/auth"
        }
    ];

    return (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 md:gap-8">
                {/* Title Centered (Col 3-10) */}
                <div className="md:col-start-3 md:col-span-8 text-center mb-4 md:mb-8">
                    <h2 className="text-2xl font-semibold text-slate-50 tracking-tight">
                        {t('concepts_title')}
                    </h2>
                </div>

                {/* Cards (4 cols on desktop, 2x2 on tablet, stack on mobile) */}
                {features.map((f, i) => (
                    <Link
                        key={i}
                        href={f.href}
                        className="col-span-1 md:col-span-6 lg:col-span-3 group p-6 rounded-2xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-700 transition-all"
                    >
                        <div className="text-2xl mb-4 grayscale group-hover:grayscale-0 transition-all">{f.icon}</div>
                        <h3 className="font-semibold text-slate-100 mb-2 truncate">{f.title}</h3>
                        <p className="text-sm text-slate-400 line-clamp-2 h-10 mb-4">{f.desc}</p>
                        <span className="text-xs font-medium text-sky-400 group-hover:text-sky-300 transition-colors flex items-center gap-1">
                            {t('link_more')}
                            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
