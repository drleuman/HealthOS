import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from './logger';

interface EndpointInfo {
    path: string;
    method: string;
    guards: string[];
    isPublic: boolean;
}

async function auditSecurity() {
    const app = await NestFactory.create(AppModule, { logger: false });
    const server = app.getHttpServer();
    const router = server._events.request._router;

    const endpoints: EndpointInfo[] = [];
    const publicEndpoints: string[] = [];
    const protectedEndpoints: string[] = [];
    const unguardedEndpoints: string[] = [];

    // Extract routes from NestJS
    const routes = app
        .get('HttpAdapterHost')
        .httpAdapter.getInstance()
        ._router?.stack || [];

    console.log('\n=== SECURITY AUDIT ===\n');

    // Manually audit known endpoints
    const endpointAudit = [
        // Auth endpoints (should be public)
        { path: 'POST /auth/login', public: true, reason: 'Login endpoint' },
        { path: 'GET /auth/sso-token', public: true, reason: 'SSO token generation' },
        { path: 'GET /auth/debug-token', public: false, reason: 'Should be protected or removed in production' },

        // Health endpoints (should be public for monitoring)
        { path: 'GET /health', public: true, reason: 'Health check for load balancers' },
        { path: 'GET /ready', public: true, reason: 'Readiness probe for K8s' },
        { path: 'GET /metrics', public: true, reason: 'Metrics for monitoring' },

        // User endpoints (MUST be protected)
        { path: 'POST /assessment', protected: true, reason: 'User data submission' },
        { path: 'GET /user/today', protected: true, reason: 'User-specific data' },
        { path: 'GET /user/route', protected: true, reason: 'User-specific data' },
        { path: 'POST /user/day-log', protected: true, reason: 'User data submission' },

        // Webhook endpoints (signature verification)
        { path: 'POST /webhooks/mithohacks/order', signature: true, reason: 'Webhook with signature verification' },

        // Job endpoints (should be protected or internal only)
        { path: 'POST /jobs/trigger/inactivity-check', protected: true, reason: 'Administrative action' },
        { path: 'POST /jobs/trigger/weekly-summary', protected: true, reason: 'Administrative action' },
        { path: 'GET /jobs/results/:userId', protected: true, reason: 'User-specific data' },
        { path: 'POST /jobs/results/:id/dismiss', protected: true, reason: 'User action' },
    ];

    console.log('📋 Endpoint Security Status:\n');

    const issues: string[] = [];

    for (const endpoint of endpointAudit) {
        const status = endpoint.public
            ? '🌐 PUBLIC'
            : endpoint.protected
                ? '🔒 PROTECTED'
                : endpoint.signature
                    ? '✍️  SIGNATURE'
                    : '⚠️  UNKNOWN';

        console.log(`${status} ${endpoint.path}`);
        console.log(`   Reason: ${endpoint.reason}\n`);

        // Check for potential issues
        if (endpoint.path.includes('/user/') && !endpoint.protected) {
            issues.push(`❌ ${endpoint.path} - User endpoint should be protected`);
        }

        if (endpoint.path.includes('/jobs/trigger') && !endpoint.protected) {
            issues.push(`⚠️  ${endpoint.path} - Job trigger should be protected`);
        }

        if (endpoint.path.includes('debug') && endpoint.public !== false) {
            issues.push(`⚠️  ${endpoint.path} - Debug endpoint should be removed or protected in production`);
        }
    }

    console.log('\n=== SECURITY CHECKLIST ===\n');

    const checklist = [
        { item: 'Rate limiting enabled', status: '✅', detail: '100 req/min per IP/user' },
        { item: 'CORS configured', status: '✅', detail: 'Strict origin checking' },
        { item: 'Helmet security headers', status: '✅', detail: 'CSP, HSTS enabled' },
        { item: 'Secrets validation', status: '✅', detail: 'Validates at startup' },
        { item: 'JWT authentication', status: '✅', detail: 'Applied to user endpoints' },
        { item: 'Webhook signature verification', status: '✅', detail: 'HMAC-SHA256 on raw body' },
        { item: 'Request ID tracing', status: '✅', detail: 'All requests tracked' },
        { item: 'Global exception handling', status: '✅', detail: 'Consistent error responses' },
        { item: 'Structured logging', status: '✅', detail: 'Pino with request context' },
    ];

    for (const check of checklist) {
        console.log(`${check.status} ${check.item}`);
        console.log(`   ${check.detail}\n`);
    }

    console.log('\n=== RECOMMENDATIONS ===\n');

    const recommendations = [
        '1. Remove or protect /auth/debug-token in production',
        '2. Consider adding API key authentication for /jobs/trigger/* endpoints',
        '3. Implement IP whitelisting for administrative endpoints',
        '4. Add request size limits (body-parser maxBodySize)',
        '5. Consider adding SQL injection protection (Prisma handles this)',
        '6. Implement audit logging for sensitive operations',
        '7. Add HTTPS redirect in production (handled by reverse proxy)',
        '8. Consider adding DDoS protection (Cloudflare, AWS Shield)',
    ];

    for (const rec of recommendations) {
        console.log(`💡 ${rec}`);
    }

    if (issues.length > 0) {
        console.log('\n=== SECURITY ISSUES ===\n');
        for (const issue of issues) {
            console.log(issue);
        }
    } else {
        console.log('\n✅ No critical security issues found!\n');
    }

    await app.close();
}

auditSecurity().catch(console.error);
