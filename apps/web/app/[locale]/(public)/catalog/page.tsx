import React from 'react';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/catalog/ProductCard';

export default async function CatalogPage({ params }: { params: { locale: string } }) {
    const { locale } = params;

    // Fetch products and categories
    const [{ products, pagination }, categories] = await Promise.all([
        api.getCatalogProducts({ perPage: 24 }),
        api.getCatalogCategories()
    ]);

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <header className="relative py-16 overflow-hidden">
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
                        Mithohacks Catalog
                    </h1>
                    <p className="max-w-2xl mx-auto text-xl text-slate-400">
                        Explora nuestra selección exclusiva de biohacks, suplementos y herramientas para optimizar tu fisiología.
                    </p>
                </div>
            </header>

            {/* Categories Filter (Horizontal Scroll) */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar border-b border-slate-800/60">
                <button className="px-6 py-2 rounded-full bg-cyan-600 text-white text-sm font-bold whitespace-nowrap shadow-lg shadow-cyan-600/20">
                    Todos los productos
                </button>
                {categories.map((cat: any) => (
                    <button
                        key={cat.id}
                        className="px-6 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-sm font-semibold whitespace-nowrap hover:bg-slate-800 transition-colors"
                    >
                        {cat.name} ({cat.count})
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {products.map((product: any) => (
                    <ProductCard key={product.id} product={product} locale={locale} />
                ))}
            </div>

            {/* Empty State */}
            {products.length === 0 && (
                <div className="py-24 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border border-slate-800 mb-6">
                        <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-200 mb-2">No se encontraron productos</h2>
                    <p className="text-slate-500">Intenta cambiar los filtros o vuelve más tarde.</p>
                </div>
            )}

            {/* Simple Pagination Placeholder */}
            {pagination.totalPages > 1 && (
                <div className="pt-12 flex justify-center gap-2">
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => (
                        <button
                            key={i}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${pagination.page === i + 1 ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
