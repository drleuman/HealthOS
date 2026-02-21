'use client';
import { useTranslations } from 'next-intl';

// Pilares de evidencia — datos reales y verificables
const EVIDENCE_PILLARS = [
    {
        id: 'evidence',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.412 2.502a54.105 54.105 0 01-10.977 0c-1.442.209-2.412-1.502-1.412-2.502L5 14.5" />
            </svg>
        ),
        ref: 'Huberman Lab · Satchin Panda · Matthew Walker',
    },
    {
        id: 'community',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
        ),
        ref: 'Comunidad activa en protocolos',
    },
    {
        id: 'longterm',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ),
        ref: 'Protocolos de 7–21 días con seguimiento',
    },
] as const;

export default function TrustStrip() {
    const t = useTranslations('Public.Landing.trust');

    return (
        <section className="bg-slate-900 px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        {t('title')}
                    </h2>
                    <p className="mt-6 text-lg leading-8 text-slate-300 max-w-2xl mx-auto">
                        {t('intro')}
                    </p>
                </div>

                {/* Pilares de confianza */}
                <dl className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
                    {EVIDENCE_PILLARS.map((pillar) => (
                        <div
                            key={pillar.id}
                            className="flex flex-col items-center text-center gap-4 rounded-2xl border border-slate-800 bg-slate-800/30 p-8 transition hover:border-slate-700"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 text-slate-300">
                                {pillar.icon}
                            </div>
                            <dt className="text-sm font-semibold uppercase tracking-widest text-slate-400">
                                {/* @ts-ignore – dynamic key */}
                                {t(`label_${pillar.id}`)}
                            </dt>
                            <dd className="text-xs text-slate-500 leading-relaxed">
                                {pillar.ref}
                            </dd>
                        </div>
                    ))}
                </dl>

                {/* Disclaimer clínico */}
                <p className="mt-12 text-center text-xs text-slate-600 max-w-xl mx-auto leading-relaxed">
                    HealthOS no es un producto médico. Los protocolos son herramientas de hábitos. Consulta a un profesional de salud ante cualquier condición médica.
                </p>
            </div>
        </section>
    );
}
