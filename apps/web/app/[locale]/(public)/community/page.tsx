import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export default function CommunityPage() {
    const t = useTranslations('Community');

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 animate-fade">
            <header className="mb-10">
                <h1 className="text-3xl md:text-4xl font-semibold text-slate-100">{t('title') || 'Comunidad'}</h1>
                <p className="text-slate-400 mt-2 max-w-2xl">{t('subtitle') || 'Conecta, comparte y aprende con otros usuarios.'}</p>
            </header>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {['Guías', 'Recursos', 'FAQs', 'Eventos'].map((section) => (
                    <div key={section} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:bg-slate-900/60 transition-colors">
                        <div className="h-10 w-10 rounded-xl bg-slate-800/60 grid place-items-center text-slate-200 mb-4">
                            {/* Icon Placeholder */}
                            <span className="text-lg">#</span>
                        </div>
                        <h3 className="text-slate-100 font-medium mb-2">{section}</h3>
                        <Link href="#" className="text-sm text-cyan-200 hover:text-cyan-100">Ver más &rarr;</Link>
                    </div>
                ))}
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 text-center">
                <h2 className="text-xl font-medium text-slate-100 mb-2">¿Tienes preguntas?</h2>
                <p className="text-slate-400 mb-6">Únete a nuestro canal de soporte o revisa la documentación.</p>
                <Link href="/support" className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium transition-colors">
                    Ir a Soporte
                </Link>
            </section>
        </div>
    );
}
