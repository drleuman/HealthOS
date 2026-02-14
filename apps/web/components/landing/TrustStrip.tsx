import { useTranslations } from 'next-intl';

export function TrustStrip() {
    const t = useTranslations('Landing.Trust');

    const pillars = [
        {
            title: t('pilar_1_title') || 'Registro sin recordatorios',
            body: t('pilar_1_body') || 'El sistema nunca te pedirá que entres. Tú decides cuándo hay algo relevante que registrar.'
        },
        {
            title: t('pilar_2_title') || 'Privacidad por diseño',
            body: t('pilar_2_body') || 'Tus datos están encriptados y separados de tu identidad pública en la comunidad.'
        },
        {
            title: t('pilar_3_title') || 'Datos útiles, sin presión',
            body: t('pilar_3_body') || 'Visualiza tendencias reales, no metas artificiales o gamificación adictiva.'
        }
    ];

    return (
        <section className="mx-auto max-w-6xl px-4 py-12">
            <div className="grid sm:grid-cols-3 gap-6">
                {pillars.map((pilar, i) => (
                    <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:bg-slate-900/60 transition-colors">
                        <h3 className="text-slate-100 font-medium text-lg mb-2">{pilar.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{pilar.body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
