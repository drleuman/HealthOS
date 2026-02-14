'use client';

import { useRouter } from '@/lib/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';

export default function AppRootPage() {
    const router = useRouter();

    useEffect(() => {
        if (api.isAuthenticated()) {
            router.push('/app/today');
        } else {
            router.push('/auth');
        }
    }, [router]);

    return (
        <div className="flex flex-1 items-center justify-center h-screen">
            <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-cyan-400 animate-spin"></div>
        </div>
    );
}
