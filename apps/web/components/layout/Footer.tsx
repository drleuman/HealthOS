import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export function Footer() {
    const t = useTranslations('Components.Footer');
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-slate-800/60 bg-slate-950">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">

                    {/* Brand */}
                    <div className="flex flex-col items-center gap-1 sm:items-start">
                        <span className="text-slate-100 font-bold text-lg tracking-tight">HealthOS</span>
                        <span className="text-slate-500 text-xs">{t('tagline')}</span>
                    </div>

                    {/* Links */}
                    <nav aria-label="Footer links" className="flex items-center gap-6">
                        <Link
                            href="/legal/privacy"
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {t('privacy')}
                        </Link>
                        <Link
                            href="/legal/terms"
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {t('terms')}
                        </Link>
                    </nav>

                    {/* Copyright */}
                    <p className="text-slate-600 text-xs text-center sm:text-right">
                        © {year} HealthOS. {t('all_rights_reserved')}
                    </p>

                </div>
            </div>
        </footer>
    );
}
