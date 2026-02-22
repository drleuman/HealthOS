import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

@Injectable()
export class AnalyticsIntegrationService implements OnModuleInit {
    private readonly logger = new Logger(AnalyticsIntegrationService.name);
    private posthogApiKey: string | undefined;
    private posthogHost: string = 'https://app.posthog.com';

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        this.posthogApiKey = this.configService.get<string>('POSTHOG_API_KEY');
        this.posthogHost = this.configService.get<string>('POSTHOG_HOST') || 'https://app.posthog.com';

        if (!this.posthogApiKey) {
            this.logger.warn('POSTHOG_API_KEY not found. Server-side analytics will be disabled.');
        }
    }

    /**
     * Track event in PostHog
     */
    async track(userId: string, event: string, properties: Record<string, any> = {}) {
        if (!this.posthogApiKey) return;

        try {
            const response = await fetch(`${this.posthogHost}/capture/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: this.posthogApiKey,
                    event: event,
                    properties: {
                        distinct_id: userId,
                        $insert_id: uuidv4(),
                        ...properties,
                        $lib: 'healthos-backend',
                        $lib_version: '1.0.0'
                    },
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`PostHog tracking failed: ${error}`);
            }
        } catch (e) {
            this.logger.error('PostHog connection error', e);
        }
    }

    /**
     * Identify user in PostHog
     */
    async identify(userId: string, properties: Record<string, any> = {}) {
        return this.track(userId, '$identify', { $set: properties });
    }
}
