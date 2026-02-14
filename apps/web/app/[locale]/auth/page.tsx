import { PublicShell } from '@/components/layout/PublicShell';
import { useTranslations } from 'next-intl';

export default function AuthPage() {
    const t = useTranslations('Auth');

    return (
        <PublicShell>
            <div className="flex-grow flex items-center justify-center p-4 min-h-[60vh]">
                <div className="w-full max-w-md bg-slate-900/50 backdrop-blur rounded-3xl border border-slate-800 p-8 shadow-xl">
                    <header className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-slate-100 mb-2">Bienvenido a HealthOS</h1>
                        <p className="text-slate-400 text-sm">Acceder a tu instrumento personal.</p>
                    </header>

                    <form className="space-y-4">
                        <div>
                            <label className="block text-slate-300 text-sm font-medium mb-1.5 ml-1">Email</label>
                            <input
                                type="email"
                                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all"
                                placeholder="nombre@ejemplo.com"
                            />
                        </div>

                        <button className="w-full rounded-xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/25 px-4 py-3 hover:bg-cyan-400/20 transition-all font-medium mt-2">
                            Continuar
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-500">
                            Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                        </p>
                    </div>
                </div>
            </div>
        </PublicShell>
    );
}
