import { Link } from '../../lib/navigation';
import { useTranslations } from 'next-intl';

export function Hero() {
    const t = useTranslations('Landing.Hero');

    return (
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-100 leading-tight tracking-tight">
                    {t('title') || 'Comunidad e Instrumento'}
                </h1>
                <p className="text-lg text-slate-300 max-w-prose leading-relaxed">
                    {t('subtitle') || 'Una plataforma doble: espacio público para aprender y conectar, y un instrumento privado para el registro neutral de observaciones.'}
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                    <Link href="/auth" className="px-6 py-3 rounded-xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/25 hover:bg-cyan-400/20 font-medium transition-all">
                        {t('cta_primary') || 'Acceder al Instrumento'}
                    </Link>
                    <Link href="/learn" className="px-6 py-3 rounded-xl bg-slate-800/60 text-slate-200 hover:bg-slate-800 font-medium transition-all">
                        {t('cta_secondary') || 'Ver cómo funciona'}
                    </Link>
                </div>
            </div>

            {/* Visual Placeholder for Hero Image/Graphic */}
            <div className="relative h-64 md:h-96 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-center overflow-hidden animate-fade delay-100">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 opacity-50" />
                <div className="text-slate-700 font-mono text-sm">[ Visual Abstracto ]</div>
            </div>
        </section>
    );
}
