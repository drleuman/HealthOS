import { useTranslations } from 'next-intl';

export default function ProductsPage() {
    const t = useTranslations('Products');

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 animate-fade">
            <header className="mb-10">
                <h1 className="text-3xl md:text-4xl font-semibold text-slate-100">{t('title') || 'Productos'}</h1>
                <p className="text-slate-400 mt-2 max-w-2xl">{t('subtitle') || 'Herramientas diseñadas para la comunidad.'}</p>
            </header>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="group rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                        <div className="h-40 rounded-xl bg-slate-950/50 mb-4 border border-slate-800/50 flex items-center justify-center text-slate-700">
                            [Img]
                        </div>
                        <h3 className="text-slate-100 font-medium text-lg">Producto {i}</h3>
                        <p className="text-slate-400 text-sm mt-1">Descripción corta del producto que explica su valor principal.</p>
                        <div className="text-slate-200 mt-4 font-medium">$XX.XX</div>
                        <button className="mt-4 w-full px-4 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-100 transition-colors text-sm font-medium">
                            Ver detalles
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
