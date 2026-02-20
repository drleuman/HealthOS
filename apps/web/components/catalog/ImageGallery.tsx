'use client';

import React, { useState } from 'react';

export const ImageGallery = ({ images }: { images: string[] }) => {
    const [active, setActive] = useState(0);
    const gallery = images.length > 0 ? images : ['https://via.placeholder.com/600x600?text=No+Image'];

    return (
        <div className="flex flex-col gap-4">
            {/* Main image */}
            <div className="overflow-hidden rounded-2xl bg-slate-900 border border-slate-800/60 aspect-square group">
                <img
                    src={gallery[active]}
                    alt="Product detail"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            </div>

            {/* Thumbnails */}
            {gallery.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                    {gallery.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActive(idx)}
                            className={`
                aspect-square rounded-lg overflow-hidden border-2 transition-all 
                ${active === idx ? 'border-cyan-500 scale-95 shadow-lg shadow-cyan-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'}
              `}
                        >
                            <img src={img} alt={`Thumb ${idx}`} className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
