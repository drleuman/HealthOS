import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    integrations: [
        Sentry.replayIntegration(),
    ],
    beforeSend(event) {
        // Scrub sensitive headers
        if (event.request && event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie']; // optional but good practice
        }
        return event;
    },
    initialScope: {
        tags: {
            app: 'healthos-web',
            release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
        }
    }
});
