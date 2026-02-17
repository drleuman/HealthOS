'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { CommunityCatalog } from '@healthos/shared';

// Helper for minimal item display
const CatalogGrid = ({ items, type, locale }: { items: any[], type: string, locale: string }) => {
    const t = useTranslations('Public.Landing.ecosystem');
    if (!items || items.length === 0) return <div className="text-slate-500 text-sm">{t('coming_soon')}</div>;

    const featured = items.filter(i => i.featured).slice(0, 3);
    const displayItems = featured.length > 0 ? featured : items.slice(0, 3);

    return (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {displayItems.map((item) => (
                <Link
                    key={item.id}
                    // Determine href based on type (Simplified to category for now to avoid 404s)
                    href={type === 'product'
                        ? `/community/products`
                        : type === 'course'
                            ? `/community/courses`
                            : `/community/blog`
                    }
                    className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm transition hover:bg-slate-800 hover:shadow-md hover:border-slate-700"
                >
                    <div className="flex flex-1 flex-col justify-between p-6">
                        <div className="flex-1">
                            <div className="text-sm font-medium text-indigo-400 uppercase tracking-wider mb-2">
                                {type === 'product' ? (item.currency === 'EUR' ? '€' : '$') + (item.priceCents / 100).toFixed(0) : (type === 'blog' ? `${item.readingMinutes} min` : `${item.modulesCount} modules`)}
                            </div>
                            <div className="mt-2 block">
                                <p className="text-xl font-semibold text-slate-100">{item.title[locale] || item.title['es']}</p>
                                <p className="mt-3 text-sm text-slate-400 line-clamp-3">{item.excerpt[locale] || item.excerpt['es']}</p>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default function EcosystemTabs({ catalog, locale }: { catalog: CommunityCatalog, locale: string }) {
    const t = useTranslations('Public.Landing.ecosystem');
    const [activeTab, setActiveTab] = useState<'products' | 'courses' | 'blog'>('products');

    const tabs = [
        { id: 'products', label: t('tabs.products') },
        { id: 'courses', label: t('tabs.courses') },
        { id: 'blog', label: t('tabs.blog') },
    ] as const;

    return (
        <section className="bg-slate-900/20 py-16 sm:py-24 border-y border-slate-800/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="sm:text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
                        {t('title')}
                    </h2>
                    <p className="mt-2 mx-auto max-w-2xl text-lg text-slate-400">
                        {t('intro')}
                    </p>
                </div>

                <div className="mt-12 flex justify-center">
                    <nav className="flex space-x-4 rounded-xl bg-slate-950 p-1 border border-slate-800" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={[
                                    activeTab === tab.id ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 border-transparent',
                                    'whitespace-nowrap rounded-lg px-4 py-2 border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'
                                ].join(' ')}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-4">
                    {activeTab === 'products' && <CatalogGrid items={catalog.products} type="product" locale={locale} />}
                    {activeTab === 'courses' && <CatalogGrid items={catalog.courses} type="course" locale={locale} />}
                    {activeTab === 'blog' && <CatalogGrid items={catalog.blog} type="blog" locale={locale} />}
                </div>

                <div className="mt-10 text-center">
                    <Link
                        href={`/community/${activeTab}`}
                        className="text-sm font-semibold leading-6 text-indigo-400 hover:text-indigo-300"
                    >
                        {t('view_all')} <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
