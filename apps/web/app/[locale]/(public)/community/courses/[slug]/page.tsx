import React from 'react';
import { getEnhancedCatalog } from '@/lib/catalog';
import { Link } from '@/lib/navigation';

export default async function CourseDetailPage({ params }: { params: { locale: string; slug: string } }) {
    const { locale, slug } = params;
    const catalog = await getEnhancedCatalog(locale);
    const course = catalog.courses.find((c) => c.slug === slug);

    if (!course) {
        return (
            <div className="py-32 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-3xl font-extrabold text-slate-100 mb-4">Módulo no encontrado</h1>
                <p className="text-slate-400 mb-8">El programa que buscas no está disponible en este momento.</p>
                <Link
                    href={`/community/courses`}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-full transition-colors inline-block text-sm"
                >
                    &larr; Volver a Rutas de Aprendizaje
                </Link>
            </div>
        );
    }

    const title = course.title?.[locale as 'es' | 'en'] || course.title?.['es'] || 'Programa HealthOS';
    const excerpt = course.excerpt?.[locale as 'es' | 'en'] || course.excerpt?.['es'] || '';
    const modules = course.modulesCount || 4;

    return (
        <div className="min-h-screen bg-slate-950 pb-24 border-t border-slate-900">
            {/* Split Header Banner */}
            <div className="relative bg-slate-900 overflow-hidden border-b border-cyan-900/40">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent z-0" />
                <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
                    <div>
                        <Link
                            href={`/community/courses`}
                            className="text-cyan-500 hover:text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-2 mb-8 text-[10px]"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                            Explorar Academia
                        </Link>

                        <div className="flex gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20">
                                {modules} Módulos Interactivos
                            </span>
                            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                                Basado en Evidencia
                            </span>
                        </div>

                        <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
                            {title}
                        </h1>
                        <p className="text-xl leading-relaxed text-slate-300 font-light max-w-lg mb-10">
                            {excerpt}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                href={`/${locale}/auth`}
                                className="inline-flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 px-8 rounded-full transition-all hover:scale-105"
                            >
                                Iniciar el Programa
                                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="aspect-square max-w-md mx-auto relative group">
                            <div className="absolute inset-0 bg-cyan-500 rounded-3xl opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-700" />
                            <div className="relative h-full w-full rounded-3xl bg-slate-800 border border-slate-700 overflow-hidden flex flex-col pt-8">
                                <div className="px-8 pb-8 flex-1">
                                    <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30">
                                        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
                                    <div className="w-full bg-slate-900 rounded-full h-2 my-6 overflow-hidden">
                                        <div className="bg-cyan-500 h-2 w-0 rounded-full"></div>
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium">0% Completado. Listo para empezar.</p>
                                </div>
                                <div className="bg-slate-900 p-6 border-t border-slate-800 flex items-center justify-between">
                                    <span className="text-xs uppercase tracking-widest font-bold text-slate-500">Formato HD</span>
                                    <span className="text-xs uppercase tracking-widest font-bold text-slate-500">{modules} Clases</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Syllubas & Details */}
            <div className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div className="lg:col-span-2 space-y-12">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                                <span className="w-8 h-px bg-cyan-500" />
                                Acerca del curso
                            </h2>
                            <div className="prose prose-invert prose-p:text-slate-300 prose-p:leading-relaxed max-w-none">
                                <p>Este programa interactivo está diseñado bajo los fundamentos biológicos que optimizan la vida moderna. Al desbloquear el curso completo, accederás a una metodología probada paso a paso donde te guiamos desde la teoría fisiológica hasta la táctica más avanzada del día a día, ajustada a tu perfil cronobiológico.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-8 uppercase tracking-tight flex items-center gap-3">
                                <span className="w-8 h-px bg-cyan-500" />
                                Contenido (Syllabus)
                            </h2>

                            <div className="space-y-4">
                                {/* Módulo 1 */}
                                <div className="border border-slate-800 rounded-2xl bg-slate-900/30 overflow-hidden">
                                    <div className="p-6 flex items-center justify-between cursor-not-allowed group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-400 font-bold group-hover:bg-slate-700 transition-colors">1</div>
                                            <div>
                                                <h4 className="text-white font-bold tracking-tight">Fundamentos Biológicos</h4>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">2 Lecciones &bull; Teoría</p>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Módulo 2 */}
                                <div className="border border-slate-800 rounded-2xl bg-slate-900/30 overflow-hidden opacity-80">
                                    <div className="p-6 flex items-center justify-between cursor-not-allowed group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-400 font-bold group-hover:bg-slate-700 transition-colors">2</div>
                                            <div>
                                                <h4 className="text-white font-bold tracking-tight">Aplicación de Protocolos Diarios</h4>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">4 Lecciones &bull; Práctica</p>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Módulo ... N */}
                                <div className="border border-slate-800 rounded-2xl bg-slate-900/30 overflow-hidden opacity-60">
                                    <div className="p-6 flex items-center justify-between cursor-not-allowed group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-400 font-bold group-hover:bg-slate-700 transition-colors">+</div>
                                            <div>
                                                <h4 className="text-white font-bold tracking-tight">{modules > 2 ? modules - 2 : 0} módulos adicionales ocultos</h4>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Contenido exclusivo</p>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-6 bg-cyan-900/10 border border-cyan-800/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                                <div className="relative z-10 w-full sm:w-auto">
                                    <h4 className="text-white font-bold text-lg mb-2">Acceso a la plataforma principal</h4>
                                    <p className="text-slate-400 text-sm max-w-sm">Si eres usuario o paciente de HealthOS, tu progreso guardado y test de entrada te esperan.</p>
                                </div>
                                <Link
                                    href={`/${locale}/auth`}
                                    className="relative z-10 w-full sm:w-auto whitespace-nowrap bg-white text-slate-950 px-6 py-3 rounded-full font-bold text-sm tracking-wide hover:bg-slate-200 transition-colors text-center shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    Identificarse
                                </Link>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500 rounded-full blur-[100px] opacity-10 pointer-events-none" />
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md">
                            <h3 className="text-xl font-bold text-white mb-6">Qué incluye tu acceso</h3>
                            <ul className="space-y-4 mb-8">
                                {['Metodología probada paso a paso.', 'Material descargable en PDF.', 'Acceso ilimitado por 1 año.', 'Soporte de la comunidad de HealthOS.', 'Actualizaciones regulares'].map((perk, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                                        <svg className="w-5 h-5 shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                            <hr className="border-slate-800 mb-8" />
                            <Link
                                href={`/${locale}/auth`}
                                className="w-full flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 rounded-xl transition-colors mb-4"
                            >
                                Iniciar Acceso
                            </Link>
                            <p className="text-center text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center justify-center gap-2">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Validación segura OAUTH2
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
