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
                        <span className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">BETA</span>
                    </div>

                    {/* Col 4-9: Links (Centered-ish) */}
                    <div className="col-span-6 hidden md:flex items-center justify-center gap-6 lg:gap-8">
                        <Link href="/community" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                            {t('community')}
                        </Link>
                        <Link href="/learn" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                            {t('learn')}
                        </Link>
                        <Link href="/blog" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                            {t('blog')}
                        </Link>
                        <Link href="/courses" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                            {t('courses')}
                        </Link>
                        <Link href="/products" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
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
