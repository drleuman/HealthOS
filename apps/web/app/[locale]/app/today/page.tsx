'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '../ProtectedRoute';
import { AmbientAnchor } from '../../components/AmbientAnchor';
import { useTranslations } from 'next-intl';

interface TodayData {
  day: number;
  program_id: string;
  tasks: string[];
  recommendation: string | null;
  lastRecordAt?: string | null;
  banners?: Array<{
    id: string;
    type: string;
    message: string | null;
    data: any;
  }>;
}

export default function TodayPage() {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [recordLabel, setRecordLabel] = useState('');

  useEffect(() => {
    // 1. Perceptual Layer (Metrology): Interaction-based rotation
    // Hash based on FULL STATE (JSON.stringify) instead of just day/program
    // This ensures rotation tracks *changes* in state (actions), de-resonating from daily routine
    const seed = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const absoluteHash = Math.abs(hash);
    const variantIndex = absoluteHash % 4;
    setRecordLabel(t(`record_variant_${variantIndex}`));
  }, [data, t]);

  useEffect(() => {
    let mounted = true;

    const loadToday = async () => {
      try {
        const result = await api.getToday();
        if (mounted) {
          setData(result);
          api.trackEvent('day_started', {
            day: result.day,
            program: result.program_id,
            banners_count: result.banners?.length || 0
          });
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading today:', err);
          setError(t('system_error') + ': ' + t('plan_load_failed'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (api.isAuthenticated()) {
      loadToday();
    } else {
      router.push('/' as any);
    }

    return () => { mounted = false; };
  }, [router]);

  const handleComplete = async () => {
    if (!data) return;
    setCompleting(true);
    try {
      await api.logDay({ day: data.day, action_completed: true });
      api.trackEvent('day_completed', { day: data.day, program: data.program_id });
      router.push('/app/route' as any);
    } catch (err) {
      setError(t('system_error'));
      setCompleting(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push('/' as any);
  };

  if (loading) {
    return (
      <div className="layout-container justify-center items-center">
        <small className="meta animate-fade">{t('initializing_sensors')}</small>
      </div>
    );
  }

  if (error) {
    return (
      <div className="layout-container justify-center">
        <div className="card" style={{ borderColor: 'var(--text-tertiary)' }}>
          <p className="meta" style={{ color: '#FF6B6B' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-secondary mt-4 w-full">{t('retry_connection')}</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // In control: render same block structure but "Context unavailable" or empty state to avoid revealing group
  const interventionBanner = data.banners?.find(b => ['clarify', 'reduce', 're_engage', 'reframe'].includes(b.type));

  // Help toggle state
  // We'll use a simple details/summary or state
  // For now, simpler: details/summary is native

  // Time ago calculation
  const getTimeAgo = () => {
    if (!data?.lastRecordAt) return null;
    const lastDate = new Date(data.lastRecordAt);
    const diffMs = Date.now() - lastDate.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHrs >= 1) {
      return t('last_record', { time: t('time_ago_hours', { h: diffHrs }) });
    } else if (diffMins >= 1) {
      return t('last_record', { time: t('time_ago_minutes', { m: diffMins }) });
    }
    return t('last_record', { time: t('time_ago_just_now') });
  };

  return (
    <ProtectedRoute>
      <div className="layout-container">
        {/* Minimal logout fix right */}
        <div className="flex justify-end pt-2 pb-8">
          <button onClick={handleLogout} className="meta opacity-40 hover:opacity-100 transition-all" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            {t('terminate_session')}
          </button>
        </div>

        {/* 1. Centro de Gravedad: Estado + Acción */}
        <div className="section flex-grow flex flex-col justify-center items-center gap-12" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <div className="text-center">
            <h1 className="text-primary mb-2" style={{ fontSize: '15px', letterSpacing: '0.1em' }}>{t('instrument_ready')}</h1>
            <small className="meta" style={{ color: 'var(--accent)' }}>{t('instrument_window')}</small>
          </div>

          <div className="w-full max-w-[320px]">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full flex items-center justify-center transition-all duration-300 group"
              style={{
                height: '48px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                cursor: completing ? 'not-allowed' : 'pointer'
              }}
            >
              <div className="flex items-center gap-4 w-full">
                <div className="h-[1px] flex-grow bg-white/10 group-hover:bg-white/30 transition-all"></div>
                <span className="whitespace-nowrap px-4 group-hover:text-white transition-all">
                  {completing ? t('transmitting') : (recordLabel || t('record_variant_0'))}
                </span>
                <div className="h-[1px] flex-grow bg-white/10 group-hover:bg-white/30 transition-all"></div>
              </div>
            </button>
            <div className="text-center mt-6">
              <small className="meta" style={{ opacity: 0.3 }}>{getTimeAgo()}</small>
            </div>
          </div>

          <div className="text-center opacity-30 hover:opacity-100 transition-all">
            <details className="text-center">
              <summary
                className="meta cursor-pointer"
                style={{ opacity: 0.5, listStyle: 'none' }}
                onClick={() => api.trackEvent('details_expanded')}
              >
                {t('technical_details')}
              </summary>
              <div className="mt-6 flex flex-col gap-6 items-center">
                <p className="text-xs" style={{ maxWidth: '280px', margin: '0 auto', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {t('technical_details_content')}
                </p>

                {/* Sub-metadatos: Protocolos y Leyes movidos aquí */}
                <div className="w-full border-t border-white/5 pt-6 text-left px-4">
                  <small className="meta mb-4 block opacity-50">{t('active_protocols')}</small>
                  <div className="flex flex-col gap-3">
                    {data.tasks && data.tasks.length > 0 ? (
                      data.tasks.map((task, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                          <span className="meta" style={{ textTransform: 'none', fontSize: '11px' }}>{task}</span>
                        </div>
                      ))
                    ) : (
                      <span className="meta">{t('no_active_protocols')}</span>
                    )}
                  </div>

                  <div className="mt-8 border-t border-white/5 pt-6">
                    <div className="flex gap-2 items-start">
                      <span className="meta opacity-50" style={{ minWidth: '80px', fontSize: '10px' }}>{t('system_law_label')}</span>
                      <span className="meta" style={{ textTransform: 'none', color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.4' }}>
                        {t('system_law_content')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* 2. Footer Discreto (Metadatos Ambientales) */}
        <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-end opacity-20 hover:opacity-70 transition-all">
          <div className="flex flex-col gap-1">
            <small className="meta" style={{ fontSize: '9px' }}>{t('system_version')}</small>
            <small className="meta" style={{ fontSize: '9px' }}>{t('dataset_label')}: {data.program_id.toUpperCase()}</small>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <small className="meta" style={{ fontSize: '9px' }}>{t('event_ref_label')}: {data.day}</small>
            <small className="meta" style={{ fontSize: '9px' }}>{t('freq_label')}</small>
          </div>
        </div>

        {/* Contexto Externo (Footnote) */}
        {interventionBanner && (
          <div className="mt-4 animate-fade opacity-50 border-l border-accent/30 pl-4 py-2">
            <p className="text-xs italic leading-relaxes text-secondary" style={{ maxWidth: '340px' }}>
              {interventionBanner.message}
            </p>
          </div>
        )}

        <AmbientAnchor />
      </div>
    </ProtectedRoute>
  );
}
