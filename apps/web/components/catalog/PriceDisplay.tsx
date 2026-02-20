import React from 'react';

export const PriceDisplay = ({
    price,
    regularPrice,
    salePrice,
    currency = '€',
    className = ""
}: {
    price: string;
    regularPrice?: string;
    salePrice?: string;
    currency?: string;
    className?: string;
}) => {
    const isSale = salePrice && salePrice !== regularPrice;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {isSale ? (
                <>
                    <span className="text-xl font-bold text-white">{price}{currency}</span>
                    <span className="text-sm line-through text-slate-500">{regularPrice}{currency}</span>
                </>
            ) : (
                <span className="text-xl font-bold text-white">{price || regularPrice}{currency}</span>
            )}
        </div>
    );
};
