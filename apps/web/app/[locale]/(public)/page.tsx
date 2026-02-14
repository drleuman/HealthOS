import { Hero } from '@/components/landing/Hero';
import { FeatureGrid4 } from '@/components/landing/FeatureGrid4';
import { HowItWorksSplit } from '@/components/landing/HowItWorksSplit';
import { ContentTriColumn } from '@/components/landing/ContentTriColumn';
import { WhatNotCard } from '@/components/landing/WhatNotCard';
import { InstrumentCTA } from '@/components/landing/InstrumentCTA';

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-slate-950 min-h-screen selection:bg-sky-500/30 selection:text-sky-200">
      <Hero />
      <FeatureGrid4 />
      <HowItWorksSplit />
      <ContentTriColumn />
      <WhatNotCard />
      <InstrumentCTA />
    </div>
  );
}
