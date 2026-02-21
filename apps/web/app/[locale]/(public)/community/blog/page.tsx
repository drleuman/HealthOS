import { getEnhancedCatalog } from '@/lib/catalog';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';

export default async function BlogPage({ params }: { params: { locale: string } }) {
    const { locale } = params;
    const catalog = await getEnhancedCatalog(locale);
    const t = await getTranslations('Public.Blog');

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <header className="mb-12 border-b border-slate-800/50 pb-8 text-center">
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-100 tracking-tight mb-4">
                    {t('title')}
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {catalog.blog.map((post) => (
                    <article
                        key={post.id}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 transition hover:border-slate-700 hover:bg-slate-900/60"
                    >
                        {post.image?.src && (
                            <div className="aspect-[16/9] w-full overflow-hidden">
                                <img
                                    src={post.image.src}
                                    alt={post.image.alt?.[locale as 'es' | 'en'] || post.image.alt?.['es'] || ''}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                            </div>
                        )}
                        <div className="flex flex-1 flex-col p-6">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-cyan-500 mb-2">
                                    {post.readingMinutes ? `${post.readingMinutes} min de lectura` : 'Artículo'}
                                </p>
                                <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-cyan-400 transition-colors">
                                    {post.title[locale as 'es' | 'en'] || post.title['es']}
                                </h3>
                                <p className="text-slate-400 text-sm line-clamp-3 mb-6">
                                    {post.excerpt[locale as 'es' | 'en'] || post.excerpt['es']}
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <Link
                                    href={`/community/blog/${post.slug}`}
                                    className="text-sm font-bold uppercase tracking-widest text-slate-100 hover:text-cyan-400 transition-colors inline-flex items-center gap-2"
                                >
                                    {t('read_more')}
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {catalog.blog.length === 0 && (
                <div className="py-24 text-center">
                    <p className="text-slate-500 italic">No hay lecturas disponibles en este momento.</p>
                </div>
            )}
        </div>
    );
}
