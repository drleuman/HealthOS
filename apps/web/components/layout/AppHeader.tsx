'use client';

import { Link, usePathname } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function AppHeader() {
    const t = useTranslations('App.Nav');
    const pathname = usePathname();

    const tabs = [
        { href: '/app/today', label: t('today') },
        { href: '/app/history', label: t('history') },
        { href: '/app/protocols', label: t('protocols') },
    ];

    return (
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/70">
            <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
                <Link href="/app/today" className="font-semibold text-slate-100 tracking-tight hover:opacity-80 transition-opacity">
                    HealthOS
                </Link>

                <nav className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800/50">
                    {tabs.map(tab => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isActive
                                    ? 'bg-slate-800 text-slate-100 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                    }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                <button className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider font-medium">
                    {t('logout')}
                </button>
            </div>
        </header>
    );
}
