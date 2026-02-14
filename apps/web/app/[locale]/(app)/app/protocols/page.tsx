'use client';

import { useRouter } from '@/lib/navigation';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock data
const PROTOCOLS = [
    {
        id: 'p1',
        title: 'Verificación de Entorno',
        description: 'Confirmación de las condiciones ambientales aceptables para la medición. Se debe realizar antes de cualquier otro registro.',
        duration: 'Instantáneo',
        status: 'active'
    },
    {
        id: 'p2',
        title: 'Registro de Estado Base',
        description: 'Observación pasiva de las variables fisiológicas sin intervención. El sujeto debe estar en reposo relativo.',
        duration: '2 min',
        status: 'active'
    }
];

export default function ProtocolsPage() {
    const router = useRouter();

    return (
        <ProtectedRoute>
            <div className="animate-fade pb-12">
                <header className="mb-8">
                    <h1 className="text-3xl font-semibold text-slate-100">Protocolos</h1>
                    <p className="text-slate-400 mt-2">Detalle de procedimientos activos para el instrumento.</p>
                </header>

                <div className="space-y-4">
                    {PROTOCOLS.map((p) => (
                        <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-slate-200 font-medium text-lg">{p.title}</h3>
                                <span className="text-xs text-slate-500 bg-slate-950/30 px-2 py-1 rounded border border-slate-800/50">{p.duration}</span>
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed mb-4">{p.description}</p>

                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                <span className="text-xs text-slate-300 uppercase tracking-wide">Activo en fase actual</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 border-t border-slate-800 pt-6">
                    <button
                        onClick={() => router.push('/app/today')}
                        className="w-full rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 px-4 py-3 transition-all font-medium border border-slate-700 hover:border-slate-600"
                    >
                        Volver al registro
                    </button>
                </div>
            </div>
        </ProtectedRoute>
    );
}
