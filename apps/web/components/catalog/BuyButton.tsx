import React from 'react';

export const BuyButton = ({
    buyUrl,
    stockStatus,
    variant = 'primary',
    className = ""
}: {
    buyUrl: string;
    stockStatus: string;
    variant?: 'primary' | 'outline';
    className?: string;
}) => {
    const outOfStock = stockStatus === 'outofstock';

    if (outOfStock) {
        return (
            <button
                disabled
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm bg-slate-800 text-slate-500 cursor-not-allowed ${className}`}
            >
                Agotado
            </button>
        );
    }

    return (
        <a
            href={buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
        block w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm text-center transition-all duration-300
        ${variant === 'primary'
                    ? 'bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30'
                    : 'border-2 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-500'}
        ${className}
      `}
        >
            Comprar ahora
        </a>
    );
};
