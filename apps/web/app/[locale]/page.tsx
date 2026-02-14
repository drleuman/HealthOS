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
    <main className="layout-container justify-center">
      <div className="spacer" />

      <div className="w-full animate-fade">
        {/* 1. Nombre sistema */}
        <div className="mb-4">
          <small className="meta">{t('system_id_label')}</small>
          <h1 className="mt-1" style={{ fontSize: '24px', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            {t('title')}
          </h1>
        </div>

        {/* 2. Propiedades técnicas */}
        <div className="mb-8 p-4 border border-[var(--border)] rounded-[var(--radius-md)]"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between mb-2">
            <span className="meta">{t('mode_label')}</span>
            <span className="meta text-primary">{t('mode_value')}</span>
          </div>
          <div className="flex justify-between">
            <span className="meta">{t('feedback_label')}</span>
            <span className="meta text-primary">{t('feedback_value')}</span>
          </div>
        </div>

        {/* 3. Acceso */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="meta mb-2 block">{t('user_identifier_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email_placeholder')}
              autoComplete="email"
              spellCheck={false}
            />
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? t('initializing') : t('open_environment')}
            </button>
          </div>
        </form>
      </div>

      <div className="spacer" />

      <div className="text-center pb-4">
        <small className="meta" style={{ opacity: 0.4 }}>{t('secure_connection')}</small>
      </div>
    </main>
  );
}
