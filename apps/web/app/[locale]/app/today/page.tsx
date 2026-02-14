'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '../ProtectedRoute';
import { AmbientAnchor } from '../../components/AmbientAnchor';
import { useTranslations } from 'next-intl';
import { Topbar } from '../../components/ui';

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
      <div className="layout-container pb-12">
        <Topbar currentPath="/app/today" onLogout={handleLogout} />

        <div className="animate-fade space-y-8">
          {/* Header Section: Orienting Question */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              ¿Qué está pasando ahora?
            </h1>
            <p className="text-sm text-secondary">
              Registro puntual. Sin recordatorios.
            </p>
          </div>

          {/* Primary Action Panel */}
          <section className="card">
            <div className="flex items-center justify-between transition-opacity duration-300">
              <div className="text-sm font-medium text-primary">Registrar observación</div>
              <div className="text-xs font-mono text-tertiary">DISPONIBLE</div>
            </div>

            <button
              onClick={handleComplete}
              disabled={completing}
              className="mt-4 w-full btn border-[#2A2F3A] py-6 text-sm hover:border-secondary transition-colors duration-150"
            >
              <div className="flex flex-col items-center">
                <span>{completing ? t('transmitting') : "Registrar ahora"}</span>
                {!completing && <span className="text-[10px] font-mono opacity-20 mt-1">[ {recordLabel} ]</span>}
              </div>
            </button>

            <p className="mt-4 text-xs text-secondary leading-relaxed">
              No es necesario registrar nada. Los periodos sin registros también forman parte del estudio conductual.
            </p>
          </section>

          {/* Active Protocols Panel (Conditional) */}
          {(data.tasks && data.tasks.length > 0) && (
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-primary">Protocolos activos</div>
                <div className="text-[10px] font-mono text-tertiary">HOY</div>
              </div>
              <ul className="space-y-2">
                {data.tasks.map((task, i) => (
                  <li key={i} className="rounded-lg border border-border px-3 py-2 text-sm text-secondary">
                    {task}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Context Panel (Treatment/Control Blinded) */}
          <section className="card">
            <div className="text-sm font-medium text-primary mb-2">Contexto</div>
            <div className="text-sm text-secondary">
              {interventionBanner ? (
                <p className="italic leading-relaxed opacity-70">
                  {interventionBanner.message}
                </p>
              ) : (
                <p className="opacity-50">Sin datos contextuales.</p>
              )}
            </div>
          </section>

          {/* Technical Details (Collapsed) */}
          <details className="card p-0 overflow-hidden group">
            <summary className="p-4 cursor-pointer text-sm font-medium text-secondary hover:text-primary transition-colors flex justify-between items-center group-open:border-b border-border">
              <span>Detalles técnicos</span>
              <span className="text-[10px] font-mono opacity-40 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 space-y-4 animate-fade">
              <div className="grid gap-2 text-xs font-mono text-tertiary">
                <div className="flex justify-between"><span>Dataset</span><span>{data.program_id.toUpperCase()}</span></div>
                <div className="flex justify-between"><span>Frecuencia</span><span>ESPONTÁNEA</span></div>
                <div className="flex justify-between"><span>Ref evento</span><span>000{data.day}</span></div>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-[10px] italic leading-relaxed text-tertiary">
                  {t('system_law_label')}: {t('system_law_content')}
                </p>
              </div>
              <div className="text-[10px] text-tertiary opacity-40 text-center">
                {getTimeAgo()}
              </div>
            </div>
          </details>
        </div>

        <AmbientAnchor />
      </div>
    </ProtectedRoute>
  );
}
