import HeroBlock from '@/components/public/landing/HeroBlock';
import GoalSelector from '@/components/public/landing/GoalSelector';
import HowItWorks from '@/components/public/landing/HowItWorks';
import EcosystemTabs from '@/components/public/landing/EcosystemTabs';
import TrustStrip from '@/components/public/landing/TrustStrip';
import FinalCTA from '@/components/public/landing/FinalCTA';
import { loadCommunityCatalog } from '@healthos/shared';

// Page is an Async Server Component
export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const catalog = loadCommunityCatalog();

  return (
    <main className="flex flex-col bg-slate-950 min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200">
      <HeroBlock />
      <GoalSelector />
      <HowItWorks />
      <EcosystemTabs catalog={catalog} locale={locale} />
      <TrustStrip />
      <FinalCTA />
    </main>
  );
}
