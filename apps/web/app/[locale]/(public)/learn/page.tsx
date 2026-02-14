import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export default function LearnPage() {
    const t = useTranslations('Learn');

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 animate-fade">
            <header className="mb-10 text-center">
                <h1 className="text-3xl md:text-5xl font-semibold text-slate-100 mb-4">{t('title') || 'Centro de Aprendizaje'}</h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">{t('subtitle') || 'Todo lo que necesitas para entender y utilizar HealthOS.'}</p>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Start Here */}
                <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
                    <h2 className="text-2xl font-semibold text-slate-100 mb-4">Empieza aquí</h2>
                    <ul className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <li key={i}>
                                <Link href="#" className="block p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                    <h3 className="text-slate-200 font-medium">Guía de inicio {i}</h3>
                                    <p className="text-sm text-slate-500 mt-1">Conceptos básicos y configuración.</p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Categories */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer">
                        <div>
                            <h3 className="text-xl font-medium text-slate-100">Cursos</h3>
                            <p className="text-slate-400 text-sm mt-1">Profundiza en la teoría y práctica.</p>
                        </div>
                        <Link href="/courses" className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm">Explorar</Link>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer">
                        <div>
                            <h3 className="text-xl font-medium text-slate-100">Blog</h3>
                            <p className="text-slate-400 text-sm mt-1">Artículos y novedades recientes.</p>
                        </div>
                        <Link href="/blog" className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm">Leer</Link>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer">
                        <div>
                            <h3 className="text-xl font-medium text-slate-100">Productos</h3>
                            <p className="text-slate-400 text-sm mt-1">Herramientas para tu práctica.</p>
                        </div>
                        <Link href="/products" className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm">Ver</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
