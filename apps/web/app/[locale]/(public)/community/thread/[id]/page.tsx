'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
// We'll need a way to check if user is authenticated. 
// Ideally via a hook or higher-order component. 
// For now, I'll assume we can check a cookie or use a client-side auth state if available.
// Given previous context, we might not have a global auth provider fully exposed.
// But we can check for the existence of the session cookie via `document.cookie` as a simple client-side check, 
// OR simpler: let the API call fail/return 401 and handle it.
// BUT the requirement is "Gating: Si NO hay sesión -> mostrar Acceso para miembros".
// This implies we shouldn't even try to fetch the thread if we know we are not logged in, 
// OR the fetch returns a clear error we can catch.

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ThreadPage({ params }: { params: { id: string, locale: string } }) {
    const t = useTranslations('App.Community');
    const t_auth = useTranslations('Auth');
    const [loading, setLoading] = useState(true);
    const [thread, setThread] = useState<any>(null);
    const [replies, setReplies] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isGated, setIsGated] = useState(false);

    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Construct returnTo for login redirect
    const returnTo = encodeURIComponent(pathname + '?' + searchParams.toString());

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                // Fetch thread. Backend will return { gated: true } if not authenticated
                const res = await api.get<any>(`/community/thread/${params.id}`);

                // Check if backend sent gated response
                if (res.gated) {
                    setIsGated(true);
                } else {
                    setThread(res.thread);
                    setReplies(res.replies || []);
                }
            } catch (e: any) {
                setError('Failed to load thread');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.id]);


    if (isGated) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                    <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">{t('gated_title', { fallback: 'Acceso para miembros' })}</h2>
                <p className="text-slate-400 max-w-sm mb-8">
                    {t('gated_body', { fallback: 'Este hilo es parte del espacio de comunidad privada.' })}
                </p>
                <div className="flex gap-4">
                    <Link
                        href={`/${params.locale}/auth?returnTo=${returnTo}`}
                        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                    >
                        {t('enter_button', { fallback: 'Entrar' })}
                    </Link>
                    <Link
                        href={`/${params.locale}/community`}
                        className="rounded-lg border border-slate-700 bg-transparent px-6 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                        {t('back_to_community', { fallback: 'Volver' })}
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="py-20 text-center text-slate-500">Loading...</div>;
    }

    if (error) {
        return <div className="py-20 text-center text-red-400">{error}</div>;
    }

    if (!thread) return null;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Link href={`/${params.locale}/community`} className="text-xs text-slate-500 hover:text-slate-300">
                    &larr; {t('back_to_community', { fallback: 'Community' })}
                </Link>
            </div>

            <h1 className="text-2xl font-bold text-slate-100 mb-2">
                {/* Try to translate titleKey if available, else raw title */}
                {thread.titleKey ? t(thread.titleKey) : thread.title}
            </h1>

            <div className="text-xs text-slate-500 mb-6 flex gap-4">
                <span>{new Date(thread.lastActivityAt).toLocaleDateString()}</span>
                <span>{replies.length} replies</span>
            </div>

            {/* Replies List */}
            <div className="space-y-4 mb-10">
                {replies.map((reply: any) => (
                    <div key={reply.id} className="rounded-xl bg-slate-900/40 border border-slate-800 p-4">
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {reply.content}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            {/* User info might be distinct */}
                            User {reply.userId.slice(0, 4)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Reply Input (Stub) */}
            <div className="border-t border-slate-800 pt-6">
                <div className="rounded-xl bg-slate-900/20 border border-slate-800 p-1">
                    <textarea
                        className="w-full bg-transparent p-3 text-sm text-slate-200 focus:outline-none min-h-[80px]"
                        placeholder={t('reply_placeholder', { fallback: 'Añadir observación...' })}
                    />
                    <div className="flex justify-end p-2">
                        <button className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                            {t('send_reply', { fallback: 'Responder' })}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
