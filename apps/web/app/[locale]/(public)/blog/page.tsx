import { useTranslations } from 'next-intl';

export default function BlogPage() {
    const t = useTranslations('Blog');

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 animate-fade">
            <header className="mb-10">
                <h1 className="text-3xl md:text-4xl font-semibold text-slate-100">{t('title') || 'Blog'}</h1>
                <p className="text-slate-400 mt-2 max-w-2xl">{t('subtitle') || 'Pensamiento y actualizaciones.'}</p>
            </header>

            <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <article key={i} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:bg-slate-900/60 transition-colors cursor-pointer group">
                        <h3 className="text-slate-100 text-xl font-medium group-hover:text-cyan-200 transition-colors">Título del artículo {i}</h3>
                        <p className="text-slate-400 mt-3 leading-relaxed">
                            Resumen del contenido del artículo. Aquí se explica brevemente de qué trata el post para invitar a la lectura.
                        </p>
                        <div className="text-slate-500 text-xs mt-6 flex items-center justify-between">
                            <span>Feb {10 + i}, 2026</span>
                            <span>5 min read</span>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
