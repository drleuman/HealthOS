import { useTranslations } from 'next-intl';

export default function LearnPage() {
    const t = useTranslations('Public.Learn');

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 min-h-screen">
            {/* Header & Search */}
            <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
                <h1 className="text-4xl font-bold text-slate-100 tracking-tight">{t('title')}</h1>

                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-lg shadow-slate-950/20"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="mb-12 border-b border-slate-800/50">
                <nav className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
                    <button className="text-sky-400 font-medium border-b-2 border-sky-400 pb-4 px-1">{t('tab_guides')}</button>
                    <button className="text-slate-400 font-medium hover:text-slate-200 transition-colors pb-4 px-1">{t('tab_courses')}</button>
                    <button className="text-slate-400 font-medium hover:text-slate-200 transition-colors pb-4 px-1">{t('tab_articles')}</button>
                </nav>
            </div>

            {/* Content Grid */}
            <div>
                <h2 className="text-xl font-semibold text-slate-200 mb-6">{t('start_here')}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group rounded-2xl border border-slate-800 bg-slate-900/30 p-6 hover:bg-slate-900/50 transition-all cursor-pointer">
                            <div className="w-full h-40 rounded-xl bg-slate-800 mb-4 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                            <h3 className="text-lg font-medium text-slate-200 mb-2 group-hover:text-white">Protocolo Básico {i}</h3>
                            <p className="text-sm text-slate-400">Guía paso a paso para configurar tu entorno.</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
