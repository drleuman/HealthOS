'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Tab = 'guides' | 'courses' | 'articles';

const GUIDES = [
    { id: 1, title: 'Protocolo Básico 1', description: 'Guía paso a paso para configurar tu entorno.' },
    { id: 2, title: 'Protocolo Básico 2', description: 'Conceptos fundamentales de cronobiología.' },
    { id: 3, title: 'Protocolo Básico 3', description: 'Cómo medir tus progresos diarios.' },
];

const COURSES = [
    { id: 1, title: 'Ciclos Biológicos', description: 'Programa avanzado de regulación.', modules: '4 Módulos' },
    { id: 2, title: 'Optimización del Sueño', description: 'Técnicas avanzadas para el descanso profundo.', modules: '6 Módulos' },
];

const ARTICLES = [
    { id: 1, title: 'Estudio Clínico 1: Efectos del Protocolo', description: 'Últimos hallazgos sobre intervención conductual en el metabolismo energético.' },
    { id: 2, title: 'Impacto de la luz matutina', description: 'Revisión sobre cómo la exposición a la luz regula el cortisol.' },
    { id: 3, title: 'Nutrición y ritmo circadiano', description: 'Cuándo comer es tan importante como qué comer y sus impactos directos.' },
    { id: 4, title: 'Gestión del estrés crónico', description: 'Herramientas de recuperación activa.' },
];

export default function LearnPage() {
    const t = useTranslations('Public.Learn');
    const [activeTab, setActiveTab] = useState<Tab>('guides');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredGuides = GUIDES.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredCourses = COURSES.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredArticles = ARTICLES.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderContent = () => {
        if (activeTab === 'guides') {
            return (
                <div className="animate-fade">
                    <h2 className="text-xl font-semibold text-slate-200 mb-6">{searchQuery ? 'Resultados de Búsqueda' : t('start_here')}</h2>
                    {filteredGuides.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGuides.map((guide) => (
                                <div key={guide.id} className="group rounded-2xl border border-slate-800 bg-slate-900/30 p-6 hover:bg-slate-900/50 transition-all cursor-pointer">
                                    <div className="w-full h-40 rounded-xl bg-slate-800 mb-4 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                    <h3 className="text-lg font-medium text-slate-200 mb-2 group-hover:text-white">{guide.title}</h3>
                                    <p className="text-sm text-slate-400">{guide.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400">No se encontraron guías para "{searchQuery}"</p>
                    )}
                </div>
            );
        } else if (activeTab === 'courses') {
            return (
                <div className="animate-fade">
                    <h2 className="text-xl font-semibold text-slate-200 mb-6">{searchQuery ? 'Resultados de Búsqueda' : 'Cursos Destacados'}</h2>
                    {filteredCourses.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {filteredCourses.map((course) => (
                                <div key={course.id} className="group rounded-2xl border border-slate-800 bg-slate-900/30 p-6 hover:bg-slate-900/50 transition-all cursor-pointer flex gap-4 items-center">
                                    <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-slate-800 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex flex-col justify-center">
                                        <h3 className="text-lg font-medium text-slate-200 mb-1 group-hover:text-white">{course.title}</h3>
                                        <p className="text-sm text-slate-400 mb-3">{course.description}</p>
                                        <span className="text-xs font-semibold text-sky-400 bg-sky-400/10 px-2 py-1 rounded w-fit">{course.modules}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400">No se encontraron cursos para "{searchQuery}"</p>
                    )}
                </div>
            );
        } else {
            return (
                <div className="animate-fade">
                    <h2 className="text-xl font-semibold text-slate-200 mb-6">{searchQuery ? 'Resultados de Búsqueda' : 'Artículos de Investigación'}</h2>
                    {filteredArticles.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            {filteredArticles.map((article) => (
                                <div key={article.id} className="group rounded-2xl border border-slate-800 bg-slate-900/30 p-6 hover:bg-slate-900/50 transition-all cursor-pointer flex flex-col md:flex-row gap-6 items-start md:items-center">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-slate-200 mb-2 group-hover:text-white">{article.title}</h3>
                                        <p className="text-sm text-slate-400">{article.description}</p>
                                    </div>
                                    <div className="text-sky-400 font-medium text-sm whitespace-nowrap group-hover:text-sky-300">Leer más &rarr;</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400">No se encontraron artículos para "{searchQuery}"</p>
                    )}
                </div>
            );
        }
    };

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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('search_placeholder')}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-lg shadow-slate-950/20"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="mb-12 border-b border-slate-800/50">
                <nav className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('guides')}
                        className={`font-medium pb-4 px-1 transition-colors ${activeTab === 'guides' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t('tab_guides')}
                    </button>
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`font-medium pb-4 px-1 transition-colors ${activeTab === 'courses' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t('tab_courses')}
                    </button>
                    <button
                        onClick={() => setActiveTab('articles')}
                        className={`font-medium pb-4 px-1 transition-colors ${activeTab === 'articles' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {t('tab_articles')}
                    </button>
                </nav>
            </div>

            {/* Content Grid */}
            {renderContent()}

        </div>
    );
}
