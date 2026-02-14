import { Hero } from '../../../components/landing/Hero';
import { TrustStrip } from '../../../components/landing/TrustStrip';
import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('Public.Landing');
  const tNav = useTranslations('Public.Nav');

  return (
    <div className="animate-fade pb-24 space-y-24">

      {/* Hero Section */}
      <Hero />

      {/* Trust Strip */}
      <TrustStrip />

      {/* Quick Access Grid (Community Hub) */}
      <section className="mx-auto max-w-6xl px-4">
        <h2 className="text-2xl font-semibold text-slate-100 mb-8 tracking-tight">{t('features_title')}</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <Link href="/products" className="group rounded-2xl bg-slate-900/30 border border-slate-800 p-6 hover:bg-slate-800/50 transition-all hover:-translate-y-1">
            <span className="text-2xl mb-4 block opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">🛠️</span>
            <h3 className="text-lg font-medium text-slate-200 mb-1">{tNav('products')}</h3>
            <p className="text-sm text-slate-400">Herramientas y kits</p>
          </Link>

          <Link href="/courses" className="group rounded-2xl bg-slate-900/30 border border-slate-800 p-6 hover:bg-slate-800/50 transition-all hover:-translate-y-1">
            <span className="text-2xl mb-4 block opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">📚</span>
            <h3 className="text-lg font-medium text-slate-200 mb-1">{tNav('courses')}</h3>
            <p className="text-sm text-slate-400">Metodología profunda</p>
          </Link>

          <Link href="/blog" className="group rounded-2xl bg-slate-900/30 border border-slate-800 p-6 hover:bg-slate-800/50 transition-all hover:-translate-y-1">
            <span className="text-2xl mb-4 block opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">✍️</span>
            <h3 className="text-lg font-medium text-slate-200 mb-1">{tNav('blog')}</h3>
            <p className="text-sm text-slate-400">Artículos recientes</p>
          </Link>

          <Link href="/community" className="group rounded-2xl bg-slate-900/30 border border-slate-800 p-6 hover:bg-slate-800/50 transition-all hover:-translate-y-1">
            <span className="text-2xl mb-4 block opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">💬</span>
            <h3 className="text-lg font-medium text-slate-200 mb-1">{tNav('community')}</h3>
            <p className="text-sm text-slate-400">Debate abierto</p>
          </Link>
        </div>
      </section>

      {/* Featured Content / Latest Updates (Placeholder for "Warmth") */}
      <section className="mx-auto max-w-6xl px-4 grid md:grid-cols-12 gap-8">
        {/* Latest Articles (Col 8) */}
        <div className="md:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">Lo último en el blog</h2>
            <Link href="/blog" className="text-sm text-sky-400 hover:text-sky-300 font-medium">Ver todo &rarr;</Link>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <article key={i} className="flex gap-4 p-4 rounded-xl hover:bg-slate-900/40 transition-colors border border-transparent hover:border-slate-800/50 group cursor-pointer">
                <div className="w-24 h-24 rounded-lg bg-slate-800 flex-shrink-0" />
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-medium text-slate-200 group-hover:text-slate-100 transition-colors">Entendiendo los ritmos ultradianos {i}</h3>
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">Una exploración profunda sobre cómo los ciclos de energía afectan tu rendimiento diario fuera del sueño.</p>
                  <span className="text-xs text-slate-500 mt-2">Hace 2 días • Lectura de 5 min</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Featured Course (Col 4) */}
        <div className="md:col-span-4 space-y-6">
          <h2 className="text-xl font-semibold text-slate-100">Curso destacado</h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden group hover:border-slate-700 transition-all">
            <div className="h-40 bg-slate-800 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60" />
            </div>
            <div className="p-6">
              <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wide">Nuevo</div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">Fundamentos de HealthOS</h3>
              <p className="text-slate-400 text-sm mb-6">Domina los principios básicos para configurar tu propio sistema de salud.</p>
              <Link href="/courses" className="block w-full py-3 text-center rounded-lg bg-slate-100 text-slate-950 font-bold hover:bg-white transition-colors">
                Ver curso
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 text-center">
        <div className="py-20 rounded-3xl bg-gradient-to-b from-slate-900/50 to-transparent border border-slate-800/50">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-50 mb-6 tracking-tight">{t('cta_final_title')}</h2>
          <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">Únete a cientos de personas que ya están tomando control de sus datos con privacidad absoluta.</p>
          <Link href="/auth" className="inline-flex px-8 py-4 rounded-full bg-sky-500 text-slate-950 font-bold hover:bg-sky-400 transition-all shadow-lg shadow-sky-900/20 hover:scale-105">
            {t('cta_final_btn')}
          </Link>
        </div>
      </section>

    </div>
  );
}
