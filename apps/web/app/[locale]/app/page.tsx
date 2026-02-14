'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { Page } from '../components/ui';

export default function AppRootPage() {
    const router = useRouter();

    useEffect(() => {
        if (api.isAuthenticated()) {
            router.push('/today');
        } else {
            router.push('/login');
        }
    }, [router]);

    return (
        <Page>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
            </div>
        </Page>
    );
}
