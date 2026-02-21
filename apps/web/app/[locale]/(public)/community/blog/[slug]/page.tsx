import React from 'react';
import { getEnhancedCatalog } from '@/lib/catalog';
import { Link } from '@/lib/navigation';

export default async function BlogDetailPage({ params }: { params: { locale: string; slug: string } }) {
    const { locale, slug } = params;
    const catalog = await getEnhancedCatalog(locale);
    const post = catalog.blog.find((b) => b.slug === slug);

    if (!post) {
        return (
            <div className="py-32 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-3xl font-extrabold text-slate-100 mb-4">Artículo no encontrado</h1>
                <p className="text-slate-400 mb-8">No hemos podido localizar el artículo que buscas.</p>
                <Link
                    href={`/community/blog`}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-full transition-colors inline-block text-sm"
                >
                    &larr; Volver al Blog
                </Link>
            </div>
        );
    }

    const title = post.title?.[locale as 'es' | 'en'] || post.title?.['es'] || 'Artículo';
    const excerpt = post.excerpt?.[locale as 'es' | 'en'] || post.excerpt?.['es'] || '';
    const imageUrl = post.image?.src;

    return (
        <article className="min-h-screen pb-24 relative overflow-hidden">
            {/* Header Background Blur Effect */}
            <div className="absolute top-0 left-0 w-full h-[50vh] bg-slate-900 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-slate-950 mix-blend-multiply" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            </div>

            <div className="relative z-10 mx-auto max-w-3xl px-4 pt-20 sm:px-6 lg:px-8">
                {/* Navigation */}
                <nav className="mb-12">
                    <Link
                        href={`/community/blog`}
                        className="text-cyan-500 hover:text-cyan-400 font-bold text-sm tracking-widest uppercase flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al Blog
                    </Link>
                </nav>

                {/* Article Header */}
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                            {post.readingMinutes ? `${post.readingMinutes} min lectura` : 'Salud & Ciencia'}
                        </span>
                        <span className="text-slate-500 text-sm font-medium">
                            {new Date().toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight">
                        {title}
                    </h1>

                    <p className="text-xl sm:text-2xl text-slate-300 font-light leading-relaxed mb-8">
                        {excerpt}
                    </p>

                    {/* Author Meta (Mokced) */}
                    <div className="flex items-center gap-4 py-6 border-y border-slate-800/60">
                        <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-lg">HOS</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white uppercase tracking-widest">Equipo HealthOS</p>
                            <p className="text-sm text-slate-400">Investigación Médica y Entrenamiento</p>
                        </div>
                    </div>
                </header>

                {/* Featured Image */}
                {imageUrl && (
                    <figure className="mb-16 -mx-4 sm:mx-0">
                        <div className="aspect-[16/9] w-full overflow-hidden sm:rounded-2xl bg-slate-800 relative group">
                            <img
                                src={imageUrl}
                                alt={title}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </figure>
                )}

                {/* Article Content / Paywall Simulation */}
                <div className="prose prose-lg prose-invert prose-cyan max-w-none prose-p:leading-relaxed prose-p:text-slate-300">
                    <p className="first-letter:text-5xl first-letter:font-black first-letter:text-cyan-400 first-letter:mr-2 first-letter:float-left">
                        Basado en evidencia científica y prácticas de cronobiología de élite, este protocolo pretende establecer una línea de base inquebrantable para potenciar tu metabolismo, mejorar los ciclos de descanso y aumentar significativamente tus niveles de energía sostenida.
                    </p>

                    <p>
                        La literatura actual sugiere fuertemente que nuestra conexión y sintonía con nuestro entorno -luz ambiental, tiempos de ingesta, calidad del agua que consumimos- afecta a nuestra biología subyacente. Esta dinámica no es opcional, nuestro cuerpo está sintonizado a ciclos rítmicos.
                    </p>

                    {/* 
                      Paywall / Log-in CTA 
                    */}
                    <div className="mt-16 p-8 relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/50 text-center shadow-2xl backdrop-blur-md">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90 pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-700">
                                <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>

                            <h3 className="text-2xl font-extrabold text-white mb-3 tracking-tight">
                                Desbloquea el protocolo íntegro
                            </h3>
                            <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                                Este artículo es exclusivo para miembros de la plataforma HealthOS. Inicia sesión para continuar leyendo e implementar las etapas de optimización.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                                <Link
                                    href={`/${locale}/auth`}
                                    className="inline-flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 px-8 rounded-full transition-all hover:scale-105"
                                >
                                    Iniciar Sesión
                                </Link>
                                <Link
                                    href={`/${locale}/catalog`}
                                    className="inline-flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-full border border-slate-700 transition-colors"
                                >
                                    Ver Ecosistema
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
