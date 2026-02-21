'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminUsersList({ params: { locale } }: { params: { locale: string } }) {
    const t = useTranslations('App.Admin');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [plan, setPlan] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.adminUsers({ query, plan, status, page, limit: 15 });
            setUsers(data.users || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(loadUsers, 300);
        return () => clearTimeout(debounce);
    }, [query, plan, status, page]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-100">{t('users')}</h1>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <svg className="w-5 h-5 absolute left-3 top-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setPage(1); }}
                        placeholder={t('search')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <select
                        value={plan}
                        onChange={e => { setPlan(e.target.value); setPage(1); }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none min-w-[120px]"
                    >
                        <option value="">{t('plan')} (All)</option>
                        <option value="free">Free</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select
                        value={status}
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none min-w-[120px]"
                    >
                        <option value="">{t('status')} (All)</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('email')}</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('plan')}</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('status')}</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">{t('last_seen')}</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">{t('created_at')}</th>
                            <th className="p-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading && users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500 animate-pulse">
                                    Loading...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    {t('no_data')}
                                </td>
                            </tr>
                        ) : users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="p-4">
                                    <div className="font-medium text-slate-200">{user.email}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-1">{user.id.substring(0, 8)}...</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${user.plan === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            user.plan === 'member' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                'bg-slate-800/50 text-slate-400 border-slate-700'
                                        }`}>
                                        {user.plan}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${user.status === 'blocked' ? 'text-rose-400' : 'text-emerald-400'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'blocked' ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-400 hidden md:table-cell">
                                    {user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : '-'}
                                </td>
                                <td className="p-4 text-sm text-slate-400 hidden lg:table-cell">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right">
                                    <Link
                                        href={`/${locale}/admin/users/${user.id}`}
                                        className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {t('edit')}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 bg-slate-800 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="px-4 py-2 bg-slate-800 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
