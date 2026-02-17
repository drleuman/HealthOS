import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function TopNav() {
    const t = useTranslations('Public.Nav');

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all h-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-full">
                <div className="grid grid-cols-12 h-full items-center gap-4">

                    {/* Col 1-3: Logo */}
                    <div className="col-span-3 flex items-center gap-2">
                        <Link href="/" className="text-slate-50 text-lg font-bold tracking-tight hover:opacity-90 transition-opacity">
                            HealthOS
                        </Link>
                        <span className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                            {useTranslations('Common')('beta_label')}
                        </span>
                    </div>

                    {/* Col 4-9: Links (Centered-ish) */}
                    <div className="col-span-6 hidden md:flex items-center justify-center gap-6 lg:gap-8">
                        <Link href="/community" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                            {t('community')}
                        </Link>
                        <Link href="/learn" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147L12 14.25l7.74-4.103a.75.75 0 011.11.649v6.524a.75.75 0 01-.11.393L12 21.75l-8.74-4.103a.75.75 0 01-.11-.393v-6.524a.75.75 0 011.11-.649z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25L12 4.14a.75.75 0 00-.51-.714C8.442 2.457 5.757 2.25 3 2.25l1.096 1.096c.642.642.872 1.558.625 2.427L4.26 10.147z" />
                            </svg>
                            {t('learn')}
                        </Link>
                        <Link href="/community/blog" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                            {t('blog')}
                        </Link>
                        <Link href="/community/courses" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                            {t('courses')}
                        </Link>
                        <Link href="/community/products" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                            {t('products')}
                        </Link>
                    </div>

                    {/* Col 10-12: Actions (Right) */}
                    <div className="col-span-9 md:col-span-3 flex items-center justify-end gap-3 sm:gap-4">
                        <Link href="/auth" className="text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-50 transition-colors">
                            {t('login')}
                        </Link>
                        <Link href="/auth" className="inline-flex items-center justify-center h-8 sm:h-9 px-4 sm:px-5 rounded-full bg-slate-100 text-slate-950 text-xs sm:text-sm font-bold hover:bg-white hover:scale-105 transition-all shadow-lg shadow-slate-950/20">
                            {t('start')}
                        </Link>
                    </div>

                </div>
            </div>
        </nav>
    );
}
