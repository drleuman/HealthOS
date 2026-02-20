import { useTranslations } from 'next-intl';

export function Footer() {
    const t = useTranslations('Components.Footer');

    return (
        <footer className="border-t border-slate-800 bg-slate-950 py-12">
            <div className="mx-auto max-w-6xl px-4 text-center">
                <p className="text-slate-500 text-sm">
                    © {new Date().getFullYear()} HealthOS. {t('all_rights_reserved') || 'All rights reserved.'}
                </p>
            </div>
        </footer>
    );
}
