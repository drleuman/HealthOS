'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
  {
    id: 'sleep',
    labelKey: 'SLEEP_CYCLE',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )
  },
  {
    id: 'energy',
    labelKey: 'ENERGY_METABOLISM',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    id: 'activity',
    labelKey: 'PHYSICAL_ACTIVITY',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'nutrition',
    labelKey: 'NUTRITIONAL_INTAKE',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    )
  }
];

export default function OnboardingScreen() {
  const t = useTranslations('App.Onboarding');
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    // Simulate API setup
    setTimeout(() => {
      router.push('/app/today');
    }, 600);
  };

  return (
    <div className="layout-container justify-center">
      <div className="spacer" />

      <div className="animate-fade w-full">
        {/* Header */}
        <div className="mb-6 border-b border-white/10 pb-4">
          <small className="meta text-[10px] tracking-widest opacity-60">{t('initial_configuration')}</small>
          <h1 className="mt-2 text-white font-light text-[18px] tracking-tight">
            {t('dataset_classification')}
          </h1>
        </div>

        {/* Selection */}
        <div className="section">
          <small className="meta block mb-4 text-xs opacity-50">{t('select_primary')}</small>
          <div className="flex flex-col gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelected(cat.id)}
                className={`
                            w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-center gap-4 group
                            ${selected === cat.id
                    ? 'bg-blue-500/10 border-blue-500'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }
                        `}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${selected === cat.id ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40 group-hover:text-white/80'}
                  `}
                >
                  {cat.icon}
                </div>

                <span className={`
                  text-sm font-medium tracking-wide transition-colors
                  ${selected === cat.id ? 'text-white' : 'text-white/60 group-hover:text-white'}
                `}>
                  {t(`categories.${cat.labelKey}`)}
                </span>

                {selected === cat.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className={`
              w-full py-4 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-300
              ${!selected || submitting
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'
              }
            `}
          >
            {submitting ? t('initializing') : t('finalize')}
          </button>
        </div>
      </div>

      <div className="spacer" />
    </div>
  );
}
