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

        {/* 1. Centro de Gravedad: Jerarquía Clínica */}
        <div className="section flex-grow flex flex-col justify-center items-center gap-20" style={{ marginTop: 'auto', marginBottom: 'auto' }}>

          {/* Tier 1: Dominant Question */}
          <div className="text-center">
            <h1 className="text-primary mb-4" style={{ fontSize: '24px', fontWeight: '500', letterSpacing: '-0.02em', textTransform: 'none' }}>
              ¿Qué está pasando ahora?
            </h1>
            <p className="text-secondary" style={{ fontSize: '14px', opacity: 0.8 }}>
              {t('instrument_ready')}
            </p>
          </div>

          {/* Tier 2: Clear Action */}
          <div className="w-full max-w-[280px]">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full py-5 rounded-md transition-all duration-300 group"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                cursor: completing ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span className={completing ? 'opacity-50' : ''}>
                {completing ? t('transmitting') : t('record_variant_0')}
              </span>
            </button>
            <div className="text-center mt-6">
              <small className="meta" style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                {getTimeAgo()}
              </small>
            </div>
          </div>

          {/* Tier 3: Passive Context */}
          <div className="max-w-[300px] text-center">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              No es necesario registrar nada. Los periodos sin actividad también son parte del estudio conductual.
            </p>
          </div>

          {/* Tier 4: Technical Metadata (Collapsed) */}
          <div className="w-full border-t border-white/5 pt-8 opacity-40 hover:opacity-100 transition-all">
            <details className="group">
              <summary
                className="meta cursor-pointer text-center list-none flex items-center justify-center gap-2"
                style={{ fontSize: '10px', opacity: 0.6 }}
                onClick={() => api.trackEvent('details_expanded')}
              >
                {t('technical_details')}
              </summary>
              <div className="mt-8 grid grid-cols-1 gap-8 text-left max-w-[320px] mx-auto px-4">
                <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {t('technical_details_content')}
                </p>

                <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
                  <div className="flex justify-between items-baseline">
                    <small className="meta">{t('active_protocols')}</small>
                    <span className="meta">{data.tasks && data.tasks.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {data.tasks && data.tasks.length > 0 ? (
                      data.tasks.map((task, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-accent"></div>
                          <span className="meta" style={{ textTransform: 'none', fontSize: '11px', color: 'var(--text-secondary)' }}>{task}</span>
                        </div>
                      ))
                    ) : (
                      <span className="meta">{t('no_active_protocols')}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 opacity-60">
                  <div className="flex flex-col gap-1">
                    <small className="meta" style={{ fontSize: '9px' }}>{t('system_version')}</small>
                    <small className="meta" style={{ fontSize: '9px' }}>{t('dataset_label')}: {data.program_id.toUpperCase()}</small>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <small className="meta" style={{ fontSize: '9px' }}>{t('event_ref_label')}: {data.day}</small>
                    <small className="meta" style={{ fontSize: '9px' }}>{t('freq_label')}</small>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 pb-4">
                  <p className="text-[10px] italic leading-relaxed text-tertiary">
                    {t('system_law_label')}: {t('system_law_content')}
                  </p>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Footer: Navigational Memory */}
        <div className="mt-auto pt-8 pb-4 flex justify-center gap-8">
          <button
            onClick={() => router.push('/app/route' as any)}
            className="meta opacity-40 hover:opacity-100 transition-all"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em' }}
          >
            {t('Topbar.history').toUpperCase()}
          </button>
        </div>

        {/* Footnote Contextual */}
        {interventionBanner && (
          <div className="pb-8 animate-fade opacity-30 text-center">
            <p className="text-[10px] italic leading-relaxed text-secondary max-w-[280px] mx-auto">
              {interventionBanner.message}
            </p>
          </div>
        )}

        <AmbientAnchor />
      </div>
    </ProtectedRoute>
  );
}
