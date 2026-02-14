import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function TopNav() {
    const t = useTranslations('Public.Nav');

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link href="/" className="text-slate-50 text-lg font-bold tracking-tight hover:opacity-90 transition-opacity">
                        HealthOS
                    </Link>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">BETA</span>
                </div>

                {/* Links (Desktop) - High Contrast */}
                <div className="hidden md:flex gap-8 items-center">
                    <Link href="/products" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                        {t('products')}
                    </Link>
                    <Link href="/courses" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                        {t('courses')}
                    </Link>
                    <Link href="/blog" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                        {t('blog')}
                    </Link>
                    <Link href="/community" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                        {t('community')}
                    </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <Link href="/auth" className="text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors">
                        {t('login')}
                    </Link>
                    <Link href="/learn" className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-slate-100 text-slate-950 text-sm font-bold hover:bg-white hover:scale-105 transition-all shadow-lg shadow-slate-950/20">
                        {t('start')}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
