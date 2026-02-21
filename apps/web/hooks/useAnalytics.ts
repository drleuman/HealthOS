'use client';

import { useCallback, useEffect } from 'react';

// Basic Analytics Provider Abstraction
// Supports easy integration with Posthog, Plausible, Amplitude, Google Analytics, etc.

export type EventName =
    | 'landing_cta_click'
    | 'landing_goal_select'
    | 'landing_ecosystem_tab_click'
    | 'landing_scroll_depth'
    | 'onboarding_start_click'
    | 'nav_link_click';

export function useAnalytics() {
    const trackEvent = useCallback((eventName: EventName, properties?: Record<string, any>) => {
        // En desarrollo, registrar en consola para validar instrumentación
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Analytics Track] ${eventName}`, properties || {});
        }

        // TODO: Integrar aquí el provider. Ej: posthog.capture(eventName, properties)
        if (typeof window !== 'undefined' && (window as any).plausible) {
            (window as any).plausible(eventName, { props: properties });
        }

        if (typeof window !== 'undefined' && (window as any).posthog) {
            (window as any).posthog.capture(eventName, properties);
        }
    }, []);

    return { trackEvent };
}

// Global Hook to track Scroll Depth
export function useScrollTracking() {
    const { trackEvent } = useAnalytics();

    useEffect(() => {
        let maxScroll = 0;
        const trackedDepths = new Set<number>();

        const handleScroll = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );

            maxScroll = Math.max(maxScroll, scrollPercent);

            const depths = [25, 50, 75, 90, 100];
            depths.forEach((depth) => {
                if (maxScroll >= depth && !trackedDepths.has(depth)) {
                    trackedDepths.add(depth);
                    trackEvent('landing_scroll_depth', { depth });
                }
            });
        };

        // Usa passive para mejor rendimiento de scroll
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Ejecución inicial por si la página ya cargó scrolleada (refresh)
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [trackEvent]);
}
