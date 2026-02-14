'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

/**
 * Protected route wrapper
 * Redirects to login if not authenticated
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        if (!api.isAuthenticated()) {
            router.push('/login');
        } else {
            api.trackAppOpened();
        }
    }, [router]);

    // Show nothing while checking auth
    if (!api.isAuthenticated()) {
        return null;
    }

    return <>{children}</>;
}
