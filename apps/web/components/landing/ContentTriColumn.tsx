'use client';

import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export function ContentTriColumn() {
    const t = useTranslations('Public.Landing');

    return (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
            <div className="mb-12">
                <h2 className="text-3xl font-bold text-slate-50 tracking-tight mb-2">{t('latest_content')}</h2>
                <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

                {/* Col A: Blog (1-6) */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-slate-200">Blog</h3>
                        <Link href="/blog" className="text-sm text-sky-400 hover:text-sky-300 transition-colors">Ver todo →</Link>
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group flex gap-4 p-4 rounded-xl border border-slate-800/40 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 transition-all cursor-pointer">
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-mono">Metabolismo • 2d</div>
                                <h4 className="text-base font-medium text-slate-200 group-hover:text-emerald-300 transition-colors truncate">Entendiendo la variabilidad {i}</h4>
                                <p className="text-sm text-slate-400 line-clamp-2 mt-1">Una exploración sobre cómo los sistemas biológicos responden al estrés.</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Col B: Courses (7-12) */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-slate-200">Cursos</h3>
                        <Link href="/courses" className="text-sm text-sky-400 hover:text-sky-300 transition-colors">Ver todo →</Link>
                    </div>
                    <div className="grid gap-6">
                        {[1, 2].map((i) => (
                            <div key={i} className="group relative rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 hover:bg-slate-900/60 transition-all overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl pointer-events-none">🎓</div>
                                <h4 className="text-lg font-bold text-slate-100 mb-2">Fundamentos de HealthOS</h4>
                                <p className="text-sm text-slate-400 mb-4 line-clamp-2">Aprende los principios básicos de la observación pasiva.</p>
                                <div className="flex items-center gap-4 text-xs text-slate-500 font-mono mb-4">
                                    <span>2h 15m</span>
                                    <span>•</span>
                                    <span>Principiante</span>
                                </div>
                                <span className="inline-flex items-center text-sm font-medium text-sky-400 group-hover:translate-x-1 transition-transform">
                                    Ver curso →
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom: Community Activity (Full Width) */}
                <div className="lg:col-span-12 mt-8 lg:mt-4">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Actividad en la comunidad
                        </h3>
                        <Link href="/community" className="text-sm text-sky-400 hover:text-sky-300 transition-colors">Unirse →</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 rounded-xl border border-slate-800/40 bg-slate-950/40">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-slate-800"></div>
                                    <div className="text-xs text-slate-400">@usuario{i} • hace 2h</div>
                                </div>
                                <p className="text-sm text-slate-300 italic">"Me ayudó mucho entender que no se trata de optimizar..."</p>
                                <div className="mt-3 text-xs text-slate-500 font-medium hover:text-sky-400 cursor-pointer transition-colors">
                                    Abrir hilo ↗
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
