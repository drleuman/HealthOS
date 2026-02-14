import { useTranslations } from 'next-intl';

export default function GenericPublicPage({
    namespace,
    children
}: {
    namespace: string,
    children?: React.ReactNode
}) {
    const t = useTranslations(namespace);

    return (
        <div className="mx-auto max-w-6xl px-4 py-16 min-h-[60vh]">
            <header className="mb-12 border-b border-slate-800/50 pb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight mb-2">{t('title')}</h1>
                <p className="text-xl text-slate-400">{t('subtitle')}</p>
            </header>

            {children || (
                <div className="grid md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-8 h-64 flex flex-col justify-between animate-fade" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="w-12 h-12 rounded-lg bg-slate-800 mb-4"></div>
                            <div>
                                <div className="h-6 w-3/4 bg-slate-800/50 rounded mb-2"></div>
                                <div className="h-4 w-1/2 bg-slate-800/30 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
