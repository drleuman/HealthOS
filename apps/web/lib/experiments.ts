import { useState, useEffect } from 'react';
import { api } from './api';

/**
 * useExperiment
 * Hook to fetch deterministic A/B test variant for the current user.
 */
export function useExperiment(key: string, defaultVariant: string = 'control') {
    const [variant, setVariant] = useState<string>(() => {
        // Try to get from local storage for instant render if possible
        if (typeof window !== 'undefined') {
            return localStorage.getItem(`exp_${key}`) || defaultVariant;
        }
        return defaultVariant;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchVariant() {
            try {
                const response = await api.get(`/events/experiments/assignment?name=${key}`);
                const selectedVariant = response.variant || defaultVariant;

                if (isMounted) {
                    setVariant(selectedVariant);
                    localStorage.setItem(`exp_${key}`, selectedVariant);
                    setLoading(false);
                }
            } catch (err) {
                console.warn(`Failed to fetch experiment variant for ${key}`, err);
                if (isMounted) setLoading(false);
            }
        }

        fetchVariant();

        return () => {
            isMounted = false;
        };
    }, [key, defaultVariant]);

    return { variant, loading };
}
