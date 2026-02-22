import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BaselineService } from './baseline.service';

@Injectable()
export class LatencyInterceptor implements NestInterceptor {
    private readonly logger = new Logger('PerformanceGuard');

    constructor(private baseline: BaselineService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const now = Date.now();
        const req = context.switchToHttp().getRequest();
        const { method, url } = req;

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - now;

                // Get baseline for this route or global if not specific
                const baseline = this.baseline.getBaseline('api_latency_p95');

                // If duration is > 2x the P95 baseline, log a trace
                if (baseline && duration > baseline.mean * 3) {
                    this.logger.warn(`LATENCY_SPIKE: ${method} ${url} took ${duration}ms (Baseline P95: ${baseline.mean.toFixed(2)}ms)`);

                    // In a real scenario, we'd log more details here (DB query counts, etc.)
                    // For now, we log the request headers and duration
                    this.logger.log(`TRACE: [${method}] ${url} | User: ${req.user?.id || 'anon'} | duration: ${duration}ms`);
                }
            }),
        );
    }
}
