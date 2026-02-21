'use client';

import { useScrollTracking } from '@/hooks/useAnalytics';

/**
 * Componente cliente sin representación visual
 * Activa los eventos base como el scroll pasivo de la landing.
 */
export function LandingTracker() {
    useScrollTracking();
    return null;
}
