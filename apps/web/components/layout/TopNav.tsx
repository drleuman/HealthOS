import { Link } from '../../lib/navigation';
import { useTranslations } from 'next-intl';

export function TopNav() {
    const t = useTranslations('Navigation');

    return (
        <nav className="sticky top-0 z-50 backdrop-blur bg-slate-950/70 border-b border-slate-800 transition-all">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-slate-100 font-semibold tracking-tight hover:opacity-80 transition-opacity">
                    HealthOS
                </Link>

                {/* Links */}
                <div className="hidden md:flex gap-6 text-slate-300">
                    <Link href="/learn" className="hover:text-slate-100 transition-colors bg-slate-900/50 px-3 py-1 rounded-full text-sm">
                        {t('learn') || 'Aprende'}
                    </Link>
                    <Link href="/products" className="hover:text-slate-100 transition-colors text-sm pt-1">
                        {t('products') || 'Productos'}
                    </Link>
                    <Link href="/courses" className="hover:text-slate-100 transition-colors text-sm pt-1">
                        {t('courses') || 'Cursos'}
                    </Link>
                    <Link href="/blog" className="hover:text-slate-100 transition-colors text-sm pt-1">
                        {t('blog') || 'Blog'}
                    </Link>
                    <Link href="/community" className="hover:text-slate-100 transition-colors text-sm pt-1">
                        {t('community') || 'Comunidad'}
                    </Link>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Link href="/auth" className="px-4 py-2 rounded-lg bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/25 hover:bg-cyan-400/20 text-sm font-medium transition-all">
                        {t('login') || 'Acceder'}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
