'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useTranslations } from 'next-intl';

export default function AccessScreen() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate delay for "hardware" feel
    setTimeout(async () => {
      // Mock login for MVP
      const targetEmail = email || 'test@example.com';
      await api.login(targetEmail);
      router.push('/app/today'); // "Abrir entorno" -> Today screen
    }, 800);
  };

  return (
    <main className="layout-container justify-center pb-20">
      <div className="animate-fade space-y-6">
        {/* Header Section */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">{t('title')}</h1>
          <p className="text-sm text-secondary">
            Conexión segura. El sistema no requiere uso continuo.
          </p>
        </div>

        {/* Access Panel */}
        <section className="card">
          <form onSubmit={handleLogin}>
            <label className="label">{t('user_identifier_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              className="mt-2 input"
              autoComplete="email"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 btn btn-primary w-full transition-colors duration-150"
            >
              {isLoading ? t('initializing') : t('open_environment')}
            </button>
          </form>

          {/* Technical Metadata (Hardware-style tags) */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-2 py-1 text-[10px] font-mono border border-border text-tertiary rounded-sm">
              {t('mode_label')}: {t('mode_value')}
            </span>
            <span className="px-2 py-1 text-[10px] font-mono border border-border text-tertiary rounded-sm">
              {t('feedback_label')}: {t('feedback_value')}
            </span>
          </div>
        </section>

        {/* System Version */}
        <div className="text-center">
          <small className="meta opacity-30">{t('system_id_label')}</small>
        </div>
      </div>
    </main>
  );
}
