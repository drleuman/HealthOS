'use client';

import { Link, usePathname } from '../../lib/navigation';
import { useTranslations } from 'next-intl';

export function AppHeader() {
    const t = useTranslations('AppNavigation');
    const pathname = usePathname();

    const tabs = [
        { href: '/app/today', label: t('today') || 'Hoy' },
        { href: '/app/route', label: t('history') || 'Historial' },
        { href: '/app/protocols', label: 'Protocolos' }, // New tab
    ];

    return (
        <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur border-b border-slate-800 transition-all duration-300">
            <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
                <Link href="/app/today" className="font-semibold text-slate-100 tracking-tight hover:text-white transition-colors">
                    HealthOS
                </Link>
                <nav className="flex gap-1">
                    {tabs.map(tab => {
                        const isActive = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-slate-800/70 text-slate-100 shadow-sm ring-1 ring-slate-700/50'
                                        : 'text-slate-300 hover:bg-slate-800/40 hover:text-slate-200'
                                    }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
                <button className="text-xs text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider font-medium">
                    Salir
                </button>
            </div>
        </header>
    );
}
