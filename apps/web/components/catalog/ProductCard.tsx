import React from 'react';
import Link from 'next/link';
import { PriceDisplay } from './PriceDisplay';

export interface ProductListingItem {
    id: number;
    slug: string;
    name: string;
    price: string;
    regularPrice: string;
    salePrice: string;
    images: string[];
    shortDescription?: string;
    categories: { id: number; name: string; slug: string }[];
    stockStatus: string;
}

export const ProductCard = ({ product, locale }: { product: ProductListingItem; locale: string }) => {
    const imageUrl = product.images?.[0] || 'https://via.placeholder.com/300x300?text=No+Image';
    const outOfStock = product.stockStatus === 'outofstock';

    return (
        <div className="group relative flex flex-col rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/60 hover:shadow-2xl hover:shadow-cyan-500/10 h-full">
            <Link href={`/${locale}/catalog/${product.slug}`} className="block overflow-hidden rounded-xl bg-slate-800 aspect-square mb-4 relative">
                <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {outOfStock && (
                    <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="text-[10px] uppercase tracking-widest font-bold bg-slate-100 text-slate-950 px-3 py-1 rounded-full">
                            Agotado
                        </span>
                    </div>
                )}
            </Link>

            <div className="flex flex-col flex-grow">
                <div className="flex flex-wrap gap-1 mb-2">
                    {product.categories?.slice(0, 2).map((cat) => (
                        <span key={cat.id} className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                            {cat.name}
                        </span>
                    ))}
                </div>

                <Link href={`/${locale}/catalog/${product.slug}`} className="block">
                    <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {product.name}
                    </h3>
                </Link>

                {product.shortDescription && (
                    <div
                        className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed h-[2.5rem]"
                        dangerouslySetInnerHTML={{ __html: product.shortDescription }}
                    />
                )}

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-800/40">
                    <PriceDisplay
                        price={product.price}
                        regularPrice={product.regularPrice}
                        salePrice={product.salePrice}
                    />

                    <Link
                        href={`/${locale}/catalog/${product.slug}`}
                        className="text-[10px] uppercase tracking-widest font-bold text-cyan-500 hover:text-cyan-400 transition-colors"
                    >
                        Ver más
                    </Link>
                </div>
            </div>
        </div>
    );
};
