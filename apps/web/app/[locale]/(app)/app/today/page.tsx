'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '../ProtectedRoute';
import { useTranslations } from 'next-intl';

// 1. StatusHeader (Neutral)
function StatusHeader({ isActive, t }: { isActive: boolean; t: any }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">{t('card_title')}</h1>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${isActive ? 'bg-emerald-900/20 border-emerald-800/50 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
          {isActive ? t('status_active') : t('status_empty')}
        </span>
      </div>
    </header>
  );
}

// 2. PrimaryActionCard (No gamification, High Usability)
function PrimaryActionCard({ onAction, loading, disabled, t }: { onAction: () => void, loading: boolean, disabled: boolean, t: any }) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 mb-8 shadow-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-200 font-medium text-lg">Observación espontánea</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
            {t('no_action_note')}
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-500 border border-slate-800 px-2 py-1 rounded bg-slate-950">OBS-01</span>
      </div>

      <button
        onClick={onAction}
        disabled={disabled || loading}
        className="w-full rounded-xl bg-slate-100 text-slate-950 font-bold text-lg h-14 hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-950/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin"></span>
            <span>Sincronizando...</span>
          </>
        ) : (
          <span>{t('cta_register')}</span>
        )}
      </button>
    </div>
  );
}

// 4. ContextCard (Simplified)
function ContextCard({ banner, t }: { banner?: any, t: any }) {
  return (
    <div className="rounded-xl border border-slate-800/40 bg-slate-900/20 p-5 mb-6">
      <h3 className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">{t('context_title')}</h3>
      {banner ? (
        <div>
          <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-sky-500/50 pl-3">{banner.message}</p>
        </div>
      ) : (
        <p className="text-slate-600 text-sm italic">{t('context_empty')}</p>
      )}
    </div>
  );
}

// 5. TechnicalAccordion (Footer style)
function TechnicalDetails({ data, t }: { data: any, t: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-slate-800/50 pt-6 mt-8">
      <button onClick={() => setOpen(!open)} className="text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors flex items-center gap-2">
        <span className="w-2 h-2 rounded-sm bg-slate-800"></span>
        {t('technical_title')}
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-mono">
          <p>ID: <span className="text-slate-400">{data?.program_id || '---'}</span></p>
          <p>HASH: <span className="text-slate-400">SHA-256</span></p>
          <p>DAY: <span className="text-slate-400">{data?.day || 0}</span></p>
          <p>MODE: <span className="text-slate-400">ASYNC</span></p>
        </div>
      )}
    </div>
  );
}

export default function TodayPage() {
  const router = useRouter();
  const t = useTranslations('App.Today');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadToday = async () => {
      try {
        const result = await api.getToday();
        if (mounted) setData(result);
      } catch (err) {
        console.error(err);
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

  const handleRegister = async () => {
    if (!data) return;
    setCompleting(true);
    try {
      await api.logDay({ day: data.day, action_completed: true });
      router.push('/app/route');
    } catch (e) {
      console.error(e);
      setCompleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div></div>;
  if (!data) return null;

  const isActive = !data.completed && !data.locked;
  const interventionBanner = data.banners?.find((b: any) => ['clarify', 'reduce', 're_engage', 'reframe'].includes(b.type));

  return (
    <ProtectedRoute>
      <div className="animate-fade max-w-2xl mx-auto pb-12">
        <StatusHeader isActive={isActive} t={t} />
        <PrimaryActionCard onAction={handleRegister} loading={completing} disabled={!isActive} t={t} />
        <ContextCard banner={interventionBanner} t={t} />
        <TechnicalDetails data={data} t={t} />
      </div>
    </ProtectedRoute>
  );
}
