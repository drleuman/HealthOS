import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { MetricsService } from '../../metrics/metrics.service';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    constructor(private metrics: MetricsService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const start = Date.now();

        // Ensure request_id exists
        const requestId = request.headers['x-request-id'] || uuidv4();
        request['id'] = requestId;

        // Skip logging for noisy paths (assets, health checks)
        const path = request.originalUrl || request.url;
        const noisyPaths = ['/_next', '/favicon', '/static', '/health', '/ops/sentry-test'];
        if (noisyPaths.some(p => path.startsWith(p))) {
            return next.handle();
        }

        return next.handle().pipe(
            tap(() => {
                const duration_ms = Date.now() - start;
                const statusCode = response.statusCode;
                const userId = (request as any).user?.id || null;

                const logPayload = {
                    event: "http_request",
                    request_id: requestId,
                    method: request.method,
                    path: request.originalUrl || request.url,
                    statusCode,
                    duration_ms,
                    userId,
                    ip: request.ip || request.headers['x-forwarded-for'],
                    userAgent: request.headers['user-agent']?.substring(0, 50)
                };

                if (statusCode >= 400 && statusCode < 500) {
                    this.logger.warn(JSON.stringify(logPayload));
                } else if (statusCode >= 500) {
                    this.logger.error(JSON.stringify(logPayload));
                } else {
                    this.logger.log(JSON.stringify(logPayload));
                }

                // Record metrics
                this.metrics.recordRequest(statusCode, duration_ms);
            }),
        );
    }
}
