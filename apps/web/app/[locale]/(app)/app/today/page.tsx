'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/lib/navigation';
import { api } from '@/lib/api';
import { ProtectedRoute } from '../ProtectedRoute';
import { useTranslations } from 'next-intl';

// 1. StatusHeader
function StatusHeader({ isActive }: { isActive: boolean }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-semibold text-slate-100">Registro diario</h1>
      <div className="flex items-center gap-3 mt-2">
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${isActive ? 'bg-cyan-900/30 border-cyan-800 text-cyan-200' : 'bg-slate-800/50 border-slate-800 text-slate-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`}></span>
          {isActive ? 'VENTANA ACTIVA' : 'ESPERANDO'}
        </span>
        <span className="text-slate-400 text-sm">HOS-BETA 9.1</span>
      </div>
    </header>
  );
}

// 2. PrimaryActionCard
function PrimaryActionCard({ onAction, loading, disabled }: { onAction: () => void, loading: boolean, disabled: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-slate-200 font-medium">Estado del observador</h2>
        <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">REQ-001</span>
      </div>

      <button
        onClick={onAction}
        disabled={disabled || loading}
        className="w-full rounded-xl bg-slate-100 text-slate-950 px-4 py-3 hover:bg-white transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-3"
      >
        {loading ? 'Procesando...' : 'Registrar ahora'}
      </button>

      <p className="text-sm text-slate-400 leading-relaxed">
        El sistema no requiere datos adicionales. Solo registra la observación espontánea cuando ocurra el evento.
      </p>
    </div>
  );
}

// 3. ProtocolsCard
function ProtocolsCard({ active }: { active: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 mb-6">
      <h3 className="text-slate-300 text-sm font-medium mb-4 uppercase tracking-wide">Protocolos Activos</h3>
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-500"></span>
          <span className="text-slate-400 text-sm">Verificación de entorno (Pasivo)</span>
        </li>
        <li className="flex items-start gap-3">
          <span className={`mt-1.5 w-1 h-1 rounded-full ${active ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-slate-500'}`}></span>
          <span className="text-slate-400 text-sm">Registro de evento espontáneo (Activo)</span>
        </li>
      </ul>
    </div>
  );
}

// 4. ContextCard
function ContextCard({ banner }: { banner?: any }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 mb-6">
      {banner ? (
        <div>
          <h3 className="text-slate-200 font-medium mb-2">Aviso del sistema</h3>
          <p className="text-slate-300 text-sm leading-relaxed">{banner.message}</p>
        </div>
      ) : (
        <div className="text-center border border-dashed border-slate-800/50 rounded-xl p-4">
          <p className="text-slate-500 text-sm">Sin datos contextuales</p>
        </div>
      )}
    </div>
  );
}

// 5. TechnicalAccordion
function TechnicalAccordion({ data }: { data: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-slate-800 pt-4">
      <button onClick={() => setOpen(!open)} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
        {open ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
      </button>
      {open && (
        <div className="mt-4 space-y-2 text-xs text-slate-600 font-mono">
          <p>DATASET_ID: <span className="text-slate-400">{data?.program_id || 'UNKNOWN'}</span></p>
          <p>SYNC_MODE: <span className="text-slate-400">ASYNC_BATCH</span></p>
          <p>CLIENT_HASH: <span className="text-slate-400">SHA-256</span></p>
          <p>DAY_INDEX: <span className="text-slate-400">{data?.day || 0}</span></p>
        </div>
      )}
    </div>
  );
}

export default function TodayPage() {
  const router = useRouter();
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

  if (loading) return <div className="text-center p-12 text-slate-500 text-sm animate-pulse">Iniciando instrumento...</div>;
  if (!data) return null;

  const isActive = !data.completed && !data.locked;
  const interventionBanner = data.banners?.find((b: any) => ['clarify', 'reduce', 're_engage', 'reframe'].includes(b.type));

  return (
    <ProtectedRoute>
      <div className="animate-fade">
        <StatusHeader isActive={isActive} />
        <PrimaryActionCard onAction={handleRegister} loading={completing} disabled={!isActive} />
        <ProtocolsCard active={isActive} />
        <ContextCard banner={interventionBanner} />
        <TechnicalAccordion data={data} />

        <div className="mt-12 flex justify-center opacity-30 hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-slate-600 uppercase tracking-[0.2em]">Ambient Anchor System</span>
        </div>
      </div>
    </ProtectedRoute>
  );
}
