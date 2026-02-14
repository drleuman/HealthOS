import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function Hero() {
    const t = useTranslations('Public.Landing');

    return (
        <section className="mx-auto max-w-6xl px-4 pt-32 pb-24 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-50 leading-tight tracking-tight">
                    {t('hero_title')}
                </h1>
                <p className="text-lg text-slate-300 max-w-prose leading-relaxed">
                    {t('hero_subtitle')}
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                    <Link href="/learn" className="px-8 py-4 rounded-full bg-slate-50 text-slate-950 hover:bg-white font-bold transition-all shadow-xl shadow-slate-900/40 hover:scale-105 active:scale-95">
                        {t('hero_cta_primary')}
                    </Link>
                    <Link href="/auth" className="px-8 py-4 rounded-full bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white font-medium transition-all hover:border-slate-600">
                        {t('hero_cta_secondary')}
                    </Link>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-4">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
                        Comunidad activa
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500/80"></span>
                        Instrumento privado
                    </span>
                </div>
            </div>

            {/* Visual Placeholder for Hero Image/Graphic */}
            <div className="relative h-80 md:h-[32rem] rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden animate-fade delay-100 shadow-2xl shadow-slate-950/80">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-950/0 to-transparent opacity-50" />

                {/* Abstract UI representation */}
                <div className="w-3/4 h-3/4 rounded-xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-md p-6 relative">
                    <div className="w-1/3 h-4 bg-slate-800 rounded mb-6"></div>
                    <div className="space-y-3">
                        <div className="w-full h-2 bg-slate-800/50 rounded"></div>
                        <div className="w-5/6 h-2 bg-slate-800/50 rounded"></div>
                        <div className="w-full h-2 bg-slate-800/50 rounded"></div>
                    </div>
                    <div className="absolute bottom-6 right-6 px-4 py-2 bg-sky-500/20 text-sky-300 rounded-lg text-xs font-mono border border-sky-500/30">
                        System: Active
                    </div>
                </div>
            </div>
        </section>
    );
}
