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
      router.push('/');
    }

    return () => { mounted = false; };
  }, [router]);

  const handleComplete = async () => {
    if (!data) return;
    setCompleting(true);
    try {
      await api.logDay({ day: data.day, action_completed: true });
      api.trackEvent('day_completed', { day: data.day, program: data.program_id });
      router.push('/app/route');
    } catch (err) {
      setError(t('system_error'));
      setCompleting(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push('/');
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

  return (
    <ProtectedRoute>
      <div className="layout-container">
        {/* Topbar equivalent - minimal */}
        <div className="flex justify-between items-center mb-8">
          <span className="meta">{t('system_version')}</span>
          <button onClick={handleLogout} className="meta" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            {t('terminate_session')}
          </button>
        </div>

        {/* 1. Accion Principal (Capture State) */}
        <div className="section">
          <div className="flex justify-between mb-4">
            <div className="flex flex-col gap-1">
              <small className="meta">{t('dataset_label')}: {data.program_id.toUpperCase()}</small>
              <small className="meta">{t('freq_label')}</small>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <small className="meta">{t('event_ref_label')}: {data.day}</small>
              <small className="meta" style={{ color: 'var(--accent)' }}>{t('window_open')}</small>
            </div>
          </div>

          <div className="card" style={{ padding: '32px 16px', border: '1px solid var(--border-focus)' }}>
            <div className="text-center mb-4">
              <small className="meta" style={{ opacity: 0.7 }}>{t('instrument_status')}</small>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full flex items-center justify-center transition-all duration-100"
                style={{
                  height: '56px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  cursor: completing ? 'not-allowed' : 'pointer'
                }}
              >
                {completing ? t('transmitting') : (recordLabel || t('record_variant_0'))}
              </button>
              <div className="text-center mt-4">
                <small className="meta" style={{ opacity: 0.5 }}>{t('no_action_required')}</small>
              </div>

              {/* Collapsible Help - Native details */}
              <details className="mt-4 text-center">
                <summary
                  className="meta cursor-pointer"
                  style={{ opacity: 0.5, listStyle: 'none' }}
                  onClick={() => api.trackEvent('details_expanded')}
                >
                  {t('technical_details')}
                </summary>
                <p className="mt-2 text-xs" style={{ maxWidth: '280px', margin: '8px auto', color: 'var(--text-secondary)' }}>
                  {t('technical_details_content')}
                </p>
              </details>
            </div>
          </div>
        </div>

        {/* 2. Datos Actuales / Tareas (Technical List) */}
        <div className="section">
          <small className="meta mb-2 block">{t('active_protocols')}</small>
          <div className="card" style={{ padding: '0' }}>
            {data.tasks && data.tasks.length > 0 ? (
              data.tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-[var(--border)] last:border-0">
                  <div className="status-dot active"></div>
                  <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{task}</span>
                </div>
              ))
            ) : (
              <div className="p-4"><span className="meta">{t('no_active_protocols')}</span></div>
            )}
          </div>

          {/* 3. Behavioral Layer: Timeline Anchor */}
          {/* Metrology Adjustment: Show AFTER first observation (Day > 1) to avoid priming */}
          {data.day > 1 && (
            <div className="mt-4 px-1 text-center">
              <small className="meta" style={{ opacity: 0.5 }}>{t('timeline_origin')}</small>
            </div>
          )}

          <div className="mt-4 px-1">
            <div className="flex gap-2 items-start opacity-70">
              <span className="meta" style={{ minWidth: '80px', fontSize: '10px' }}>{t('system_law_label')}</span>
              <span className="meta" style={{ textTransform: 'none', color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.4' }}>
                {t('system_law_content')}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Contexto Externo (Intervenciones + Control Placebo) */}
        {/* Always render section header to maintain layout consistency */}
        <div className="section animate-fade">
          <small className="meta mb-2 block" style={{ color: interventionBanner ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            {t('external_context')}
          </small>

          {interventionBanner ? (
            <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--accent)' }}>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {interventionBanner.message}
              </p>
            </div>
          ) : (
            // Control Group / No Intervention State
            // Render empty state to avoid revealing "lack of treatment" as a distinct negative signal
            // Just "Context unavailable" in a neutal way
            <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--border)' }}>
              <p className="meta" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {t('no_contextual_data')}
              </p>
            </div>
          )}
        </div>

        {/* Recommendation as a footnote if exists */}
        {data.recommendation && (
          <div className="mt-8 pt-4 border-t border-[var(--border)]">
            <small className="meta block mb-1">{t('automated_note')}</small>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>{data.recommendation}</p>
          </div>
        )}

        <AmbientAnchor />

      </div>
    </ProtectedRoute >
  );
}
