import React from 'react';
import { api } from '@/lib/api';
import { ImageGallery } from '@/components/catalog/ImageGallery';
import { PriceDisplay } from '@/components/catalog/PriceDisplay';
import { BuyButton } from '@/components/catalog/BuyButton';
import Link from 'next/link';

export default async function ProductDetailPage({ params }: { params: { locale: string, slug: string } }) {
    const { locale, slug } = params;

    const product = await api.getCatalogProduct(slug);

    if (!product) {
        return (
            <div className="py-24 text-center">
                <h1 className="text-2xl font-bold">Producto no encontrado</h1>
                <Link href={`/${locale}/catalog`} className="text-cyan-500 mt-4 inline-block underline">
                    Volver al catálogo
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-16 py-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <Link href={`/${locale}/catalog`} className="hover:text-cyan-500 transition-colors">Catálogo</Link>
                <span>/</span>
                <span className="text-slate-300 truncate max-w-[200px]">{product.name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Left: Photos */}
                <ImageGallery images={product.images} />

                {/* Right: Info */}
                <div className="flex flex-col">
                    <div className="mb-8">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {product.categories.map((cat: any) => (
                                <span key={cat.id} className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {cat.name}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                            {product.name}
                        </h1>
                        <PriceDisplay
                            price={product.price}
                            regularPrice={product.regularPrice}
                            salePrice={product.salePrice}
                            className="mb-6"
                        />
                        {product.shortDescription && (
                            <div
                                className="text-slate-400 leading-relaxed mb-8 prose prose-invert prose-sm"
                                dangerouslySetInnerHTML={{ __html: product.shortDescription }}
                            />
                        )}

                        <BuyButton buyUrl={product.buyUrl} stockStatus={product.stockStatus} />

                        <p className="mt-4 text-[10px] text-center uppercase tracking-widest text-slate-600 font-bold">
                            Compra 100% segura en Mithohacks.com
                        </p>
                    </div>

                    <div className="border-t border-slate-800/60 pt-8 space-y-8">
                        {/* Attributes */}
                        {product.attributes && product.attributes.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                {product.attributes.map((attr: any) => (
                                    <div key={attr.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/40">
                                        <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">{attr.name}</span>
                                        <span className="text-sm text-slate-200">{attr.options.join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Availability */}
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${product.stockStatus === 'instock' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                {product.stockStatus === 'instock' ? 'Disponible para envío' : 'Temporalmente agotado'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Description */}
            {product.descriptionHtml && (
                <section className="border-t border-slate-800/60 pt-16">
                    <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-cyan-500 pl-6 uppercase tracking-tight">
                        Descripción Detallada
                    </h2>
                    <div
                        className="prose prose-invert prose-cyan max-w-none text-slate-300 leading-relaxed
              prose-headings:text-white prose-a:text-cyan-400 prose-strong:text-white"
                        dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                    />
                </section>
            )}

            {/* Variation Policy Note */}
            {product.type === 'variable' && (
                <div className="p-6 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 text-sm">
                    <div className="flex gap-3">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>
                            Este producto tiene variaciones (talla, color o formato). Podrás seleccionar la opción exacta al pulsar en "Comprar ahora" y ser redirigido a la tienda oficial.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
