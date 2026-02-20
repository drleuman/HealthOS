import { getEnhancedCatalog } from '@/lib/catalog';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export default async function CoursesPage({ params }: { params: { locale: string } }) {
    const { locale } = params;
    const catalog = await getEnhancedCatalog(locale);
    const t = useTranslations('Public.Courses');

    return (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <header className="mb-12 border-b border-slate-800/50 pb-8 text-center">
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-100 tracking-tight mb-4">
                    {t('title')}
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {catalog.courses.map((course) => (
                    <div
                        key={course.id}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 transition hover:border-slate-700 hover:bg-slate-900/60"
                    >
                        {course.image?.src && (
                            <div className="aspect-[16/9] w-full overflow-hidden">
                                <img
                                    src={course.image.src}
                                    alt={course.image.alt?.[locale as 'es' | 'en'] || course.image.alt?.['es'] || ''}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                            </div>
                        )}
                        <div className="flex flex-1 flex-col p-6">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-emerald-500 mb-2">
                                    {course.modulesCount ? `${course.modulesCount} módulos` : 'Curso'}
                                </p>
                                <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-emerald-400 transition-colors">
                                    {course.title[locale as 'es' | 'en'] || course.title['es']}
                                </h3>
                                <p className="text-slate-400 text-sm line-clamp-3 mb-6">
                                    {course.excerpt[locale as 'es' | 'en'] || course.excerpt['es']}
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <Link
                                    href={`/community/courses/${course.slug}`}
                                    className="inline-flex w-full items-center justify-center h-10 px-6 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold hover:bg-emerald-600/20 transition-all"
                                >
                                    {t('cta_start')}
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {catalog.courses.length === 0 && (
                <div className="py-24 text-center">
                    <p className="text-slate-500 italic">No hay cursos disponibles en este momento.</p>
                </div>
            )}
        </div>
    );
}
