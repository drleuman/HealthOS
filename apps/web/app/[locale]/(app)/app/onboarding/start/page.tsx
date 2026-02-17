'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
  { id: 'sleep', labelKey: 'SLEEP_CYCLE' },
  { id: 'energy', labelKey: 'ENERGY_METABOLISM' },
  { id: 'activity', labelKey: 'PHYSICAL_ACTIVITY' },
  { id: 'nutrition', labelKey: 'NUTRITIONAL_INTAKE' }
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
        <div className="mb-6 border-b pb-4">
          <small className="meta">{t('initial_configuration')}</small>
          <h1 className="mt-2 text-accent" style={{ fontSize: '16px' }}>
            {t('dataset_classification')}
          </h1>
        </div>

        {/* Selection */}
        <div className="section">
          <small className="meta block mb-4">{t('select_primary')}</small>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelected(cat.id)}
                className={`
                            w-full text-left p-4 rounded-sm border transition-all duration-100 flex items-center gap-3
                            ${selected === cat.id ? 'bg-card' : 'bg-transparent hover:bg-hover'}
                        `}
                style={{
                  borderColor: selected === cat.id ? 'var(--accent)' : 'var(--border)'
                }}
              >
                <div className={`
                            w-4 h-4 rounded-full border flex items-center justify-center
                        `}
                  style={{
                    borderColor: selected === cat.id ? 'var(--accent)' : 'var(--text-tertiary)'
                  }}
                >
                  {selected === cat.id && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                  )}
                </div>
                <span style={{
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  color: selected === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  {t(`categories.${cat.labelKey}`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="btn btn-primary w-full"
          >
            {submitting ? t('initializing') : t('finalize')}
          </button>
        </div>
      </div>

      <div className="spacer" />
    </div>
  );
}
