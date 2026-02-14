import { Hero } from '../../../components/landing/Hero';
import { TrustStrip } from '../../../components/landing/TrustStrip';
import { Link } from '../../../lib/navigation';
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('Landing');

  return (
    <div className="animate-fade space-y-20">

      {/* Hero Section */}
      <Hero />

      {/* Trust Strip */}
      <TrustStrip />

      {/* Feature Blocks (Quick Access) */}
      <section className="grid md:grid-cols-3 gap-6">
        <Link href="/products" className="group rounded-2xl bg-slate-900/40 border border-slate-800 p-6 hover:bg-slate-900/60 transition-all hover:border-slate-700">
          <h3 className="text-xl font-medium text-slate-100 mb-2">{t('Products.title') || 'Productos'}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">Herramientas físicas y digitales para tu práctica diaria.</p>
          <div className="mt-4 text-cyan-200 text-sm group-hover:underline">Explorar &rarr;</div>
        </Link>

        <Link href="/courses" className="group rounded-2xl bg-slate-900/40 border border-slate-800 p-6 hover:bg-slate-900/60 transition-all hover:border-slate-700">
          <h3 className="text-xl font-medium text-slate-100 mb-2">{t('Courses.title') || 'Formación'}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">Cursos especializados para profundizar en la metodología.</p>
          <div className="mt-4 text-cyan-200 text-sm group-hover:underline">Aprender &rarr;</div>
        </Link>

        <Link href="/community" className="group rounded-2xl bg-slate-900/40 border border-slate-800 p-6 hover:bg-slate-900/60 transition-all hover:border-slate-700">
          <h3 className="text-xl font-medium text-slate-100 mb-2">{t('Community.title') || 'Comunidad'}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">Conecta con otros usuarios y comparte tus experiencias.</p>
          <div className="mt-4 text-cyan-200 text-sm group-hover:underline">Unirse &rarr;</div>
        </Link>
      </section>

      {/* Community CTA */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-8 md:p-12 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-100 mb-4">Únete a HealthOS</h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8">Una plataforma doble: espacio público para aprender y conectar, y un instrumento privado para el registro neutral.</p>
          <Link href="/auth" className="inline-block px-6 py-3 rounded-xl bg-slate-100 text-slate-950 font-medium hover:bg-white transition-colors">
            Comenzar ahora
          </Link>
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-slate-950/50 pointer-events-none"></div>
      </section>

    </div>
  );
}
