import type { Metadata } from 'next';
import HeroBlock from '@/components/public/landing/HeroBlock';
import GoalSelector from '@/components/public/landing/GoalSelector';
import HowItWorks from '@/components/public/landing/HowItWorks';
import EcosystemTabs from '@/components/public/landing/EcosystemTabs';
import TrustStrip from '@/components/public/landing/TrustStrip';
import FinalCTA from '@/components/public/landing/FinalCTA';
import { getEnhancedCatalog } from '@/lib/catalog';
import { LandingTracker } from '@/components/public/landing/LandingTracker';

const BASE_URL = 'https://healthos-ten.vercel.app';

// ─── SEO Metadata ──────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { locale: string } }
): Promise<Metadata> {
  const locale = params.locale;
  const isEs = locale !== 'en';
  const canonicalUrl = `${BASE_URL}/${locale}`;

  return {
    title: isEs
      ? '¿Cuál es tu Bio-Score™? | HealthOS - Protocolo Circadiano'
      : "What's your Bio-Score™? | HealthOS - Circadian Protocol",
    description: isEs
      ? 'Test de 2 minutos para identificar desajustes circadianos. Resultados instantáneos — sin registro obligatorio para ver el valor primero.'
      : '2-minute test to identify circadian misalignments. Instant results — we removed the signup wall so you see value first.',
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'es': `${BASE_URL}/es`,
        'en': `${BASE_URL}/en`,
      },
    },
    openGraph: {
      title: isEs
        ? '¿Cuál es tu Bio-Score™? | Resultados Instantáneos'
        : "What's your Bio-Score™? | Instant Results",
      description: isEs
        ? 'He construido un sistema para recalibrar sueño y energía. Hemos quitado el registro para que veas tu Bio-Score™ al instante.'
        : "I built a system to recalibrate sleep and energy. We removed signup so you see your Bio-Score™ instantly.",
      url: canonicalUrl,
      siteName: 'HealthOS',
      locale: isEs ? 'es_ES' : 'en_US',
      type: 'website',
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'HealthOS Bio-Score',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: isEs
        ? '¿Cuál es tu Bio-Score™? 🧬'
        : "What's your Bio-Score™? 🧬",
      description: isEs
        ? 'Mira tus desajustes circadianos al instante. Sin registro previo.'
        : 'See your circadian misalignments instantly. No signup required.',
      images: [`${BASE_URL}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
      },
    },
  };
}

// ─── JSON-LD Structured Data ───────────────────────────────────────────────────
function LandingJsonLd({ locale }: { locale: string }) {
  const isEs = locale !== 'en';

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'HealthOS',
        url: BASE_URL,
        description: isEs
          ? 'Protocolo de hábitos basado en cronobiología y fisiología evolutiva.'
          : 'Habit protocol based on chronobiology and evolutionary physiology.',
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: BASE_URL,
        name: 'HealthOS',
        publisher: { '@id': `${BASE_URL}/#organization` },
        inLanguage: isEs ? 'es' : 'en',
      },
      {
        '@type': 'WebPage',
        '@id': `${BASE_URL}/${locale}/#webpage`,
        url: `${BASE_URL}/${locale}`,
        name: isEs
          ? 'HealthOS — Recalibra tu sueño, energía y digestión'
          : 'HealthOS — Recalibrate your sleep, energy and digestion',
        isPartOf: { '@id': `${BASE_URL}/#website` },
        inLanguage: isEs ? 'es' : 'en',
      },
      {
        '@type': 'FAQPage',
        mainEntity: isEs
          ? [
            {
              '@type': 'Question',
              name: '¿Cuánto tiempo requiere HealthOS al día?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Entre 5 y 10 minutos. El sistema está diseñado para integrarse en lo que ya haces, no para añadir una rutina extra.',
              },
            },
            {
              '@type': 'Question',
              name: '¿Necesito comprar suplementos?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. Los protocolos se basan en timing, luz, movimiento y alimentación. Los productos son opcionales y complementarios.',
              },
            },
            {
              '@type': 'Question',
              name: '¿Es esto lo mismo que una app de hábitos o de sueño?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. HealthOS no rastrea hábitos arbitrarios. Trabaja con protocolos fisiológicos basados en cronobiología — cada acción tiene una razón biológica específica.',
              },
            },
            {
              '@type': 'Question',
              name: '¿Cuánto cuesta?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'HealthOS tiene un plan gratuito disponible. Sin tarjeta de crédito para empezar.',
              },
            },
          ]
          : [
            {
              '@type': 'Question',
              name: 'How much time does HealthOS require per day?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: '5 to 10 minutes. The system is designed to integrate into what you already do, not to add an extra routine.',
              },
            },
            {
              '@type': 'Question',
              name: 'Do I need to buy supplements?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. The protocols are based on timing, light, movement and nutrition. Products are optional and complementary.',
              },
            },
          ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function LandingPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const catalog = await getEnhancedCatalog(locale);

  return (
    <>
      <LandingJsonLd locale={locale} />
      <LandingTracker />
      <main
        id="main-content"
        className="flex flex-col bg-slate-950 min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200"
      >
        <HeroBlock />
        <GoalSelector />
        <HowItWorks />
        <EcosystemTabs catalog={catalog} locale={locale} />
        <TrustStrip />
        <FinalCTA />
      </main>
    </>
  );
}
