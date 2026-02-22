import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { Request } from 'express';
import { SystemAlertsService } from '../../system-alerts/system-alerts.service';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
    constructor(
        protected readonly applicationRef: any,
        private readonly systemAlerts: SystemAlertsService
    ) {
        super(applicationRef);
    }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse();

        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        // Catch 429 Rate Limit
        if (status === HttpStatus.TOO_MANY_REQUESTS) {
            this.systemAlerts.registerRateLimitExceeded(request.ip || request.headers['x-forwarded-for'] as string || 'unknown').catch(e => console.error(e));
        }

        // Only report 5xx errors to Sentry and trigger Alert spikes
        if (status >= 500) {
            const route = request.route?.path || request.path;
            const errorMsg = exception instanceof Error ? exception.message : 'Unknown Server Error';

            this.systemAlerts.register5xxError(route, errorMsg).catch(e => console.error(e));

            Sentry.withScope((scope: Sentry.Scope) => {
                scope.setTag('route', route);
                scope.setTag('method', request.method);
                scope.setTag('status', status.toString());

                // Attach extras
                scope.setExtra('request_id', request.headers['x-request-id'] || (request as any)['id']);
                scope.setExtra('ip', request.ip || request.headers['x-forwarded-for']);

                // Scrub sensitive data
                const safeHeaders = { ...request.headers };
                delete safeHeaders['authorization'];
                delete safeHeaders['cookie'];
                scope.setExtra('headers', safeHeaders);

                // Extract userId if available (assuming populated by JWT Guard)
                const user = (request as any).user;
                if (user && user.id) {
                    scope.setUser({ id: user.id, email: user.email });
                }

                Sentry.captureException(exception);
            });
        }

        // Call the base filter to handle the response format (or let it bubble)
        super.catch(exception, host);
    }
}
