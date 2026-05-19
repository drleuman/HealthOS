#!/usr/bin/env node
/**
 * Release Candidate Verification Script (rc:verify)
 * Validates:
 * - Public /health endpoint
 * - Public /ready endpoint
 * - Protected /metrics endpoint (blocks anonymous, allows with x-internal-secret)
 * - Protected /internal/health-check endpoint (blocks anonymous, allows with x-internal-secret)
 */

const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:4001';
const INTERNAL_SECRET = process.env.INTERNAL_HEALTH_SECRET || process.env.X_INTERNAL_SECRET || 'dev_secret';

async function verifyEndpoint(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
        json = JSON.parse(text);
    } catch (e) {
        // Not JSON
    }
    return { status: res.status, ok: res.ok, json, text };
}

async function run() {
    console.log(`Starting Release Candidate Verification against: ${API_ORIGIN}\n`);
    let failed = false;

    // 1. Check Public /health
    try {
        const health = await verifyEndpoint(`${API_ORIGIN}/health`);
        if (health.status === 200 && health.json?.status === 'ok') {
            console.log('✅ GET /health (Public) - Passed');
        } else {
            console.error('❌ GET /health (Public) - Failed', health);
            failed = true;
        }
    } catch (e) {
        console.error('❌ GET /health (Public) - Network Error', e.message);
        failed = true;
    }

    // 2. Check Public /ready
    try {
        const ready = await verifyEndpoint(`${API_ORIGIN}/ready`);
        if (ready.status === 200 && (ready.json?.status === 'ready' || ready.json?.status === 'not_ready')) {
            console.log(`✅ GET /ready (Public) - Passed (status: ${ready.json?.status})`);
        } else {
            console.error('❌ GET /ready (Public) - Failed', ready);
            failed = true;
        }
    } catch (e) {
        console.error('❌ GET /ready (Public) - Network Error', e.message);
        failed = true;
    }

    // 3. Check /metrics is protected (Anonymous block)
    try {
        const metricsBlocked = await verifyEndpoint(`${API_ORIGIN}/metrics`);
        if (metricsBlocked.status === 401) {
            console.log('✅ GET /metrics (Protected: Anonymous Blocked) - Passed');
        } else {
            console.error('❌ GET /metrics (Protected: Anonymous Blocked) - Failed (expected 401, got ' + metricsBlocked.status + ')');
            failed = true;
        }
    } catch (e) {
        console.error('❌ GET /metrics (Protected: Anonymous Blocked) - Network Error', e.message);
        failed = true;
    }

    // 4. Check /metrics works with internal secret header
    try {
        const metricsAllowed = await verifyEndpoint(`${API_ORIGIN}/metrics`, {
            headers: {
                'x-internal-secret': INTERNAL_SECRET
            }
        });
        if (metricsAllowed.status === 200 && metricsAllowed.json?.uptime_seconds !== undefined) {
            console.log('✅ GET /metrics (Protected: Authorized) - Passed');
        } else {
            console.error('❌ GET /metrics (Protected: Authorized) - Failed', metricsAllowed);
            failed = true;
        }
    } catch (e) {
        console.error('❌ GET /metrics (Protected: Authorized) - Network Error', e.message);
        failed = true;
    }

    // 5. Check /internal/health-check is protected (Anonymous block)
    try {
        const internalBlocked = await verifyEndpoint(`${API_ORIGIN}/internal/health-check`);
        if (internalBlocked.status === 401) {
            console.log('✅ GET /internal/health-check (Protected: Anonymous Blocked) - Passed');
        } else {
            console.error('❌ GET /internal/health-check (Protected: Anonymous Blocked) - Failed (expected 401, got ' + internalBlocked.status + ')');
            failed = true;
        }
    } catch (e) {
        console.error('❌ GET /internal/health-check (Protected: Anonymous Blocked) - Network Error', e.message);
        failed = true;
    }

    // 6. Check /internal/health-check works with internal secret header
    try {
        const internalAllowed = await verifyEndpoint(`${API_ORIGIN}/internal/health-check`, {
            headers: {
                'x-internal-secret': INTERNAL_SECRET
            }
        });
        if (internalAllowed.status === 200 && internalAllowed.json?.uptime_seconds !== undefined) {
            console.log('✅ GET /internal/health-check (Protected: Authorized) - Passed');
        } else {
            console.error('❌ GET /internal/health-check (Protected: Authorized) - Failed', internalAllowed);
            failed = true;
        }
    } catch (e) {
        console.error('❌ GET /internal/health-check (Protected: Authorized) - Network Error', e.message);
        failed = true;
    }

    if (failed) {
        console.error('\n❌ Release Candidate Verification Failed.');
        process.exit(1);
    } else {
        console.log('\n🎉 All verification checks passed successfully.');
        process.exit(0);
    }
}

run().catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(2);
});
