import { getEnhancedCatalog } from '@/lib/catalog';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useTranslations } from 'next-intl';

export default async function ProductsPage({ params }: { params: { locale: string } }) {
    const { locale } = params;
    const catalog = await getEnhancedCatalog(locale);
    const t = useTranslations('Public.Products');

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {catalog.products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={{
                            id: parseInt(product.id),
                            slug: product.slug,
                            name: product.title[locale as 'es' | 'en'] || product.title['es'],
                            price: (product.priceCents! / 100).toString(),
                            regularPrice: (product.priceCents! / 100).toString(),
                            salePrice: (product.priceCents! / 100).toString(),
                            images: product.image?.src ? [product.image.src] : [],
                            shortDescription: product.excerpt[locale as 'es' | 'en'] || product.excerpt['es'],
                            categories: [], // Can lead to specific categories if needed
                            stockStatus: 'instock'
                        }}
                        locale={locale}
                    />
                ))}
            </div>

            {catalog.products.length === 0 && (
                <div className="py-24 text-center">
                    <p className="text-slate-500 italic">No hay productos disponibles en este momento.</p>
                </div>
            )}
        </div>
    );
}
