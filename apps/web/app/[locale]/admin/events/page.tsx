'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AdminEvents({ params: { locale } }: { params: { locale: string } }) {
    const t = useTranslations('App.Admin');
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState('');
    const [featureFilter, setFeatureFilter] = useState('');
    const [userIdFilter, setUserIdFilter] = useState('');
    const [period, setPeriod] = useState('7d');

    const loadEvents = async () => {
        setLoading(true);
        try {
            const data = await api.adminEvents({
                event: eventFilter,
                feature: featureFilter,
                userId: userIdFilter,
                period
            });
            setEvents(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(loadEvents, 400);
        return () => clearTimeout(debounce);
    }, [eventFilter, featureFilter, userIdFilter, period]);

    const handleExport = () => {
        if (!events.length) return;
        const csvContent = [
            ['ID', 'Event', 'User ID', 'Session ID', 'Timestamp', 'Context'],
            ...events.map(e => [
                e.id,
                e.event,
                e.userId || '',
                e.sessionId || '',
                new Date(e.timestamp).toISOString(),
                JSON.stringify(e.context || {})
            ])
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `events_export_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-100">{t('events')}</h1>
                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
                    {['24h', '7d', '30d'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto">
                    <input
                        type="text"
                        value={eventFilter}
                        onChange={e => setEventFilter(e.target.value)}
                        placeholder="Filter by Event Name"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[150px]"
                    />
                    <input
                        type="text"
                        value={featureFilter}
                        onChange={e => setFeatureFilter(e.target.value)}
                        placeholder="Filter by Feature"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[150px]"
                    />
                    <input
                        type="text"
                        value={userIdFilter}
                        onChange={e => setUserIdFilter(e.target.value)}
                        placeholder="User ID"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[150px]"
                    />
                </div>

                <button
                    onClick={handleExport}
                    disabled={!events.length}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export CSV
                </button>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('events_table.timestamp')}</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('events_table.event')}</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">{t('events_table.user_id')}</th>
                            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Context</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading && events.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500 animate-pulse">
                                    Loading...
                                </td>
                            </tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    {t('no_data')}
                                </td>
                            </tr>
                        ) : events.map(event => (
                            <tr key={event.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="p-4 whitespace-nowrap text-sm text-slate-300">
                                    {new Date(event.timestamp).toLocaleString(locale)}
                                </td>
                                <td className="p-4 font-mono text-sm text-indigo-400">
                                    {event.event}
                                </td>
                                <td className="p-4 text-sm text-slate-500 font-mono hidden md:table-cell">
                                    {event.userId ? (
                                        <Link href={`/${locale}/admin/users/${event.userId}`} className="hover:text-indigo-400 transition-colors hover:underline">
                                            {event.userId.substring(0, 12)}...
                                        </Link>
                                    ) : '-'}
                                </td>
                                <td className="p-4 hidden lg:table-cell">
                                    <pre className="text-xs text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 overflow-hidden text-ellipsis max-w-md">
                                        {JSON.stringify(event.context || {}).substring(0, 100)}
                                    </pre>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center bg-slate-900/50">
                    Showing latest up to 200 events
                </div>
            </div>
        </div>
    );
}
