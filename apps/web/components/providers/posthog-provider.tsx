'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

        if (apiKey) {
            posthog.init(apiKey, {
                api_host: host,
                person_profiles: 'identified_only',
                capture_pageview: false // Handled manually or via router-aware logic
            })
        }
    }, [])

    return <PHProvider client={posthog}>{children}</PHProvider>
}
