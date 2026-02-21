'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminUserDetail({ params: { locale, id } }: { params: { locale: string; id: string } }) {
    const t = useTranslations('App.Admin');
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [metadataStr, setMetadataStr] = useState('{}');
    const [metadataError, setMetadataError] = useState('');

    const loadUser = async () => {
        try {
            const [data, timelineData] = await Promise.all([
                api.adminUserDetail(id),
                api.adminUserTimeline(id).catch(() => []) // Fallback to empty if fails
            ]);
            setUser(data);
            setTimeline(timelineData);
            setMetadataStr(JSON.stringify(data.metadata || {}, null, 2));
        } catch (err) {
            console.error(err);
            router.push(`/${locale}/admin/users`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, [id]);

    const handleUpdate = async (field: string, value: any) => {
        if (!confirm(`Are you sure you want to change ${field} to ${value}?`)) return;
        setUpdating(true);
        try {
            await api.adminUpdateUser(id, { [field]: value });
            await loadUser();
        } catch (error) {
            console.error(error);
            alert('Update failed');
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveMetadata = async () => {
        setMetadataError('');
        try {
            const parsed = JSON.parse(metadataStr);
            setUpdating(true);
            await api.adminUpdateUser(id, { metadata: parsed });
            await loadUser();
            alert('Metadata saved!');
        } catch (e) {
            setMetadataError('Invalid JSON format');
        } finally {
            setUpdating(false);
        }
    };

    const handleRevokeSession = async (sessionId?: string) => {
        if (!confirm(t('confirm_revoke'))) return;
        setUpdating(true);
        try {
            await api.adminRevokeSessions(id, sessionId);
            await loadUser();
        } catch (error) {
            console.error(error);
            alert('Failed to revoke sessions');
        } finally {
            setUpdating(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
    if (!user) return <div className="p-8 text-center text-rose-500">User not found</div>;

    const isBlocked = user.status === 'blocked';

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/admin/users`} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            {user.email}
                            <button onClick={() => copyToClipboard(user.email, 'Email')} className="text-slate-500 hover:text-slate-300 transition-colors" title="Copy Email">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </h1>
                        <p className="text-sm font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                            {user.id}
                            <button onClick={() => copyToClipboard(user.id, 'ID')} className="text-slate-600 hover:text-slate-400 transition-colors" title="Copy ID">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        disabled={updating}
                        onClick={() => handleUpdate('status', isBlocked ? 'active' : 'blocked')}
                        className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none ${isBlocked
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 focus:ring-emerald-500'
                            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 focus:ring-rose-500'
                            }`}
                    >
                        {isBlocked ? t('unblock') : t('block')}
                    </button>

                    <button
                        disabled={updating}
                        onClick={() => handleRevokeSession()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                    >
                        {t('revoke_sessions')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-100 mb-4">Profile</h2>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                                <span className="text-slate-500">{t('status')}</span>
                                <span className={`font-medium ${isBlocked ? 'text-rose-400' : 'text-emerald-400'}`}>{user.status}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-2 items-center">
                                <span className="text-slate-500">{t('plan')}</span>
                                <select
                                    className="bg-slate-800 border-none rounded text-slate-200 outline-none p-1 font-medium cursor-pointer"
                                    value={user.plan}
                                    onChange={e => handleUpdate('plan', e.target.value)}
                                    disabled={updating}
                                >
                                    <option value="free">Free</option>
                                    <option value="member">Member</option>
                                </select>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-2 items-center">
                                <span className="text-slate-500">Role</span>
                                <select
                                    className="bg-slate-800 border-none rounded text-slate-200 outline-none p-1 font-medium cursor-pointer"
                                    value={user.role || 'user'}
                                    onChange={e => handleUpdate('role', e.target.value)}
                                    disabled={updating}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                                <span className="text-slate-500">{t('created_at')}</span>
                                <span className="text-slate-300">{new Date(user.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-2">
                                <span className="text-slate-500">{t('last_seen')}</span>
                                <span className="text-slate-300">{user.lastSeen ? new Date(user.lastSeen).toLocaleString() : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metadata, Sessions & Timeline */}
                <div className="md:col-span-2 space-y-6">
                    {/* Activity Timeline */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center justify-between">
                            Activity Timeline
                            <span className="text-xs font-normal text-slate-500">Last 20 events</span>
                        </h2>
                        {timeline && timeline.length > 0 ? (
                            <div className="space-y-4">
                                {timeline.map((event: any, index: number) => (
                                    <div key={event.id} className="relative pl-6 pb-2 border-l border-slate-800 last:border-l-transparent">
                                        <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-700 ring-4 ring-slate-900"></div>
                                        <div className="text-sm">
                                            <div className="font-mono text-indigo-400">{event.event}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {new Date(event.timestamp).toLocaleString(locale)}
                                            </div>
                                            {event.context && Object.keys(event.context).length > 0 && (
                                                <div className="mt-2 p-2 bg-slate-950 rounded-md border border-slate-800 text-xs text-slate-400 font-mono break-all">
                                                    {JSON.stringify(event.context)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4">No recent activity found.</p>
                        )}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-lg font-semibold text-slate-100">Metadata (JSON)</h2>
                            <button
                                onClick={handleSaveMetadata}
                                disabled={updating}
                                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-sky-950 font-medium rounded-lg transition-colors text-sm shadow-md"
                            >
                                {t('save')}
                            </button>
                        </div>
                        <div className="relative flex-grow">
                            <textarea
                                value={metadataStr}
                                onChange={e => setMetadataStr(e.target.value)}
                                className={`w-full h-64 p-4 font-mono text-sm bg-slate-950 text-slate-300 outline-none resize-none ${metadataError ? 'border-2 border-rose-500/50' : 'border-none'}`}
                                spellCheck="false"
                            />
                            {metadataError && <div className="absolute bottom-4 left-4 text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">{metadataError}</div>}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-100 mb-4">Active Sessions</h2>
                        {user.refreshTokens && user.refreshTokens.length > 0 ? (
                            <div className="space-y-3">
                                {user.refreshTokens.map((token: any) => (
                                    <div key={token.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                                        <div className="text-sm">
                                            <div className="font-medium text-slate-300">{token.userAgent || 'Unknown Device'}</div>
                                            <div className="text-slate-500 text-xs mt-1">
                                                IP: {token.ip || '-'} • Created: {new Date(token.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevokeSession(token.sessionId)}
                                            className="text-rose-400 hover:text-rose-300 text-xs font-medium px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-colors"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No active sessions.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
