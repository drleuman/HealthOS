import { useTranslations } from 'next-intl';

export function TrustStrip() {
    const t = useTranslations('Public.Landing');

    const pillars = [
        {
            title: t('trust_1'),
            body: "El sistema espera a que tú tengas algo que decir."
        },
        {
            title: t('trust_2'),
            body: "Tu identidad pública y tus datos privados nunca se tocan."
        },
        {
            title: t('trust_3'),
            body: "Aprende de expertos, no de algoritmos de atención."
        }
    ];

    return (
        <section className="mx-auto max-w-6xl px-4 py-12 border-y border-slate-900/50 bg-slate-950/30">
            <div className="grid sm:grid-cols-3 gap-8">
                {pillars.map((pilar, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-1 h-4 bg-sky-500/50 rounded-full"></div>
                            <h3 className="text-slate-200 font-medium text-lg">{pilar.title}</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed pl-4 border-l border-slate-800 ml-0.5">{pilar.body}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
