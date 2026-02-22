'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

export default function OnboardingResultPage() {
  const router = useRouter();
  const t = useTranslations('App.Onboarding.Result');
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pending_assessment');
    if (saved) {
      setPayload(JSON.parse(saved));
    } else {
      router.push('/onboarding');
    }
  }, [router]);

  if (!payload) return null;

  // Simplified logic to replicate backend's decideProgram for the preview
  const getProfilePreview = () => {
    const goal = payload.primary_goal;
    if (goal === 'sleep') return {
      title: t('profiles.circadian.title'),
      program: 'Circadian Reset (14 días)',
      description: t('profiles.circadian.description')
    };
    if (goal === 'energy') return {
      title: t('profiles.energy.title'),
      program: 'Energy Engine (14 días)',
      description: t('profiles.energy.description')
    };
    return {
      title: t('profiles.base.title'),
      program: 'Protocolo Base (14 días)',
      description: t('profiles.base.description')
    };
  };

  const profile = getProfilePreview();

  // Mapping recommended initial action based on goal
  const getFirstAction = () => {
    const goal = payload.primary_goal;
    if (goal === 'sleep') return t('first_win.actions.light');
    if (goal === 'energy') return t('first_win.actions.caffeine');
    return t('first_win.actions.digestive');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('first_win.share.title', { score: 64 }),
          text: t('first_win.share.text'),
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    }
  };

  return (
    <main className="layout-container justify-center pb-20 overflow-x-hidden">
      <div className="animate-fade space-y-10 max-w-sm mx-auto">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
            {t('subtitle')}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {t('title')}
          </h1>
        </div>

        {/* --- BIO-SCORE SECTION --- */}
        <section className="card p-6 flex items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-indigo-950/30">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{t('first_win.bio_score')}</h3>
            <p className="text-[10px] text-secondary">{t('first_win.score_label')}</p>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-black text-white">64<span className="text-secondary text-sm font-normal">/100</span></div>
              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
          </div>
          {/* Simple SVG Radial --- */}
          <svg className="w-16 h-16 transform -rotate-90">
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 * (1 - 0.64)} className="text-indigo-500" strokeLinecap="round" />
          </svg>
        </section>

        {/* --- FIRST WIN CARD --- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-primary uppercase tracking-tight">{t('first_win.title')}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold tracking-widest leading-normal">HOY</span>
          </div>
          <div className="card p-5 border-l-4 border-l-indigo-500 bg-indigo-500/5 space-y-3">
            <div className="text-[10px] text-secondary font-bold uppercase tracking-widest">{t('first_win.subtitle')}</div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-primary leading-tight">
                {getFirstAction()}
              </p>
            </div>
          </div>
        </section>

        {/* --- TOMORROW PREVIEW --- */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-primary uppercase tracking-tight">{t('first_win.tomorrow.title')}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold tracking-widest leading-normal">MAÑANA</span>
          </div>
          <div className="card p-5 border border-slate-800 bg-slate-900/20 backdrop-blur-sm space-y-3">
            <p className="text-sm text-primary font-medium">{t('first_win.tomorrow.subtitle')}</p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              <span>{t('first_win.tomorrow.benefit')}</span>
            </div>
          </div>
        </section>

        <section className="card space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />

          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] text-secondary uppercase font-bold tracking-widest">{t('profile_detected')}</span>
              <h2 className="text-xl font-semibold text-primary">{profile.title}</h2>
            </div>

            <p className="text-sm text-secondary leading-relaxed">
              {profile.description}
            </p>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">{t('program_assigned')}</span>
                <span className="text-xs font-bold text-indigo-400">{profile.program}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">{t('daily_commitment')}</span>
                <span className="text-xs font-bold text-slate-200">~8 minutos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary">{t('projected_efficacy')}</span>
                <span className="text-xs font-bold text-emerald-400">92%</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- ROADMAP PREVIEW --- */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-primary uppercase tracking-tight px-1">{t('first_win.next_days')}</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { day: '2', label: t('first_win.day_2'), icon: '⚡' },
              { day: '3', label: t('first_win.day_3'), icon: '🧠' },
              { day: '7', label: 'Día 7: Estabilización', icon: '🏁' }
            ].map((item) => (
              <div key={item.day} className="shrink-0 w-36 card p-3 space-y-2 bg-slate-900/40 border-dashed border-slate-800">
                <div className="text-xl">{item.icon}</div>
                <div className="text-[10px] font-bold text-secondary uppercase tracking-widest">Día {item.day}</div>
                <div className="text-[10px] text-tertiary font-bold leading-tight">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <button
            onClick={() => router.push(`/auth?returnTo=/app/today`)}
            className="w-full btn btn-primary py-4 text-sm font-bold shadow-xl shadow-indigo-500/20"
          >
            {t('sync_button')}
          </button>

          <p className="text-[10px] text-center text-secondary px-4 leading-relaxed">
            {t('disclaimer')}
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/onboarding')}
            className="text-xs text-tertiary hover:text-secondary transition-colors"
          >
            {t('edit_responses')}
          </button>
        </div>
      </div>
    </main>
  );
}
