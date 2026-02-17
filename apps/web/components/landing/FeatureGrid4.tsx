'use client';

import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function FeatureGrid4() {
    const t = useTranslations('Public.Landing');

    const features = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
            ),
            title: t('concept_knowledge'),
            desc: t('concept_knowledge_desc'),
            href: "/blog"
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147L12 14.25l7.74-4.103a.75.75 0 011.11.649v6.524a.75.75 0 01-.11.393L12 21.75l-8.74-4.103a.75.75 0 01-.11-.393v-6.524a.75.75 0 011.11-.649z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25L12 4.14a.75.75 0 00-.51-.714C8.442 2.457 5.757 2.25 3 2.25l1.096 1.096c.642.642.872 1.558.625 2.427L4.26 10.147z" />
                </svg>
            ),
            title: t('concept_education'),
            desc: t('concept_education_desc'),
            href: "/courses"
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
            ),
            title: t('concept_community'),
            desc: t('concept_community_desc'),
            href: "/community"
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v1.607a2 2 0 01-.778 1.584l-1.921 1.44a2 2 0 00-.778 1.584v4.631a2 2 0 00.778 1.584l1.921 1.44a2 2 0 01.778 1.584v1.607m1.235-14.7l.397.033A2 2 0 0113 4.981v4.917a2 2 0 00.765 1.569l1.917 1.477a2 2 0 01.765 1.569v3.424m-1.235 5.4l-.397-.033A2 2 0 0111 20.02v-4.917a2 2 0 00-.765-1.569l-1.917-1.477a2 2 0 01-.765-1.569v-3.424m10.222-1.355a2 2 0 01-1.127.304H18.06a2 2 0 00-1.492.674l-1.5 1.74a2 2 0 00-.432.784l-.873 2.91a2 2 0 01-.944 1.173L11 20" />
                </svg>
            ),
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
                        <div className="mb-4 text-slate-400 grayscale group-hover:grayscale-0 group-hover:text-sky-400 transition-all">{f.icon}</div>
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
