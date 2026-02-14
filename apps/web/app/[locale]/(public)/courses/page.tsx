import { useTranslations } from 'next-intl';

export default function CoursesPage() {
    const t = useTranslations('Courses');

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 animate-fade">
            <header className="mb-10">
                <h1 className="text-3xl md:text-4xl font-semibold text-slate-100">{t('title') || 'Cursos'}</h1>
                <p className="text-slate-400 mt-2 max-w-2xl">{t('subtitle') || 'Formación especializada.'}</p>
            </header>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2].map((i) => (
                    <div key={i} className="group rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 transition-all hover:bg-slate-900/80">
                        <div className="h-40 rounded-xl bg-slate-950/50 mb-4 border border-slate-800/50 flex items-center justify-center text-slate-700">
                            [Preview]
                        </div>

                        <div className="mb-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/20">
                                Nivel {i}
                            </span>
                        </div>

                        <h3 className="text-slate-100 font-medium text-lg">Curso {i}: Título del curso</h3>
                        <p className="text-slate-400 text-sm mt-1">Aprende los fundamentos y la práctica avanzada.</p>

                        <div className="text-slate-400 text-xs mt-3 flex gap-3">
                            <span>4 semanas</span>
                            <span>•</span>
                            <span>12 módulos</span>
                        </div>

                        <button className="mt-4 w-full px-4 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-100 transition-colors text-sm font-medium">
                            Inscribirse
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
