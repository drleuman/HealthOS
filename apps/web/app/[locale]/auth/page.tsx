'use client';

import { PublicShell } from '@/components/layout/PublicShell';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function AuthPage({ params: { locale } }: { params: { locale: string } }) {
    const t = useTranslations('Auth');
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || `/${locale}/app/today`;
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            // Call login API to set HttpOnly session cookie
            await api.login(email);

            // In a real app we'd await api.post('/auth/email', { email }) ...
            // For this "Instrument" demo, we call login and then push to returnTo
            router.push(decodeURIComponent(returnTo));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <PublicShell>
            <div className="flex-grow flex items-center justify-center p-4 min-h-[70vh]">
                <div className="w-full max-w-sm">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-slate-100 mb-2 tracking-tight">{t('title')}</h1>
                        <p className="text-slate-400 text-base">{t('subtitle')}</p>
                    </div>

                    {/* Card */}
                    <div className="bg-slate-900/40 backdrop-blur rounded-2xl border border-slate-800/60 p-6 shadow-2xl">
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="sr-only">{t('email_placeholder')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 outline-none transition-all"
                                    placeholder={t('email_placeholder')}
                                    required
                                />
                            </div>

                            <button
                                disabled={loading}
                                className="w-full rounded-xl bg-slate-100 text-slate-950 font-semibold px-4 py-3.5 hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-slate-950/20 disabled:opacity-70"
                            >
                                {loading ? '...' : t('submit')}
                            </button>
                        </form>
                    </div>

                    {/* Footer / Back link */}
                    <div className="mt-8 text-center">
                        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors border-b border-transparent hover:border-slate-500/50 pb-0.5">
                            {t('back_to_community')}
                        </Link>
                    </div>
                </div>
            </div>
        </PublicShell>
    );
}
