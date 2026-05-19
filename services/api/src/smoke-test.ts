import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';

async function runSmokeTests() {
    console.log('==================================================');
    console.log('             HEALTHOS API SMOKE TESTS             ');
    console.log('==================================================\n');

    console.log('Step: Creating NestFactory application context...');
    const app: INestApplication = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    console.log('Step: Initializing application module tree...');
    await app.init();
    console.log('Step: Application successfully initialized!');
    const server = app.getHttpServer();
    const prisma = app.get(PrismaService);

    let passes = 0;
    let failures = 0;
    let skipped = 0;

    function assert(condition: boolean, message: string) {
        if (condition) {
            console.log(`  ✅ ${message}`);
            passes++;
        } else {
            console.error(`  ❌ ${message}`);
            failures++;
        }
    }

    try {
        // --- 1. Public Route Semantics: GET /health ---
        console.log('\n--- 1. Health Endpoint (GET /health) ---');
        const healthRes = await request(server).get('/health');
        assert(healthRes.status === 200, `GET /health should return 200 (Got ${healthRes.status})`);
        assert(healthRes.body?.status === 'ok', `GET /health status should be "ok"`);

        // --- 2. Public Route Semantics: GET /ready ---
        console.log('\n--- 2. Readiness Probe (GET /ready) ---');
        const readyRes = await request(server).get('/ready');
        assert(readyRes.status === 200, `GET /ready should return 200 (Got ${readyRes.status})`);
        assert(
            readyRes.body?.status === 'ready' || readyRes.body?.status === 'not_ready',
            `GET /ready should have status "ready" or "not_ready"`
        );

        // --- 3. Telemetry/Metrics Access checks ---
        console.log('\n--- 3. Telemetry Protection (GET /metrics & GET /internal/health-check) ---');
        const metricsNoAuth = await request(server).get('/metrics');
        assert(metricsNoAuth.status === 401, `GET /metrics without secret should return 401 (Got ${metricsNoAuth.status})`);

        const internalNoAuth = await request(server).get('/internal/health-check');
        assert(internalNoAuth.status === 401, `GET /internal/health-check without secret should return 401 (Got ${internalNoAuth.status})`);

        // With correct secret (configuredSecret defaults to 'dev_secret' in dev environment)
        const metricsWithAuth = await request(server)
            .get('/metrics')
            .set('x-internal-secret', 'dev_secret');
        assert(metricsWithAuth.status === 200, `GET /metrics with secret should return 200 (Got ${metricsWithAuth.status})`);

        const internalWithAuth = await request(server)
            .get('/internal/health-check')
            .set('x-internal-health-secret', 'dev_secret');
        assert(internalWithAuth.status === 200, `GET /internal/health-check with secret should return 200 (Got ${internalWithAuth.status})`);

        // --- 4. Event Tracking: POST /events ---
        console.log('\n--- 4. Event Tracking (POST /events) ---');
        const trackRes = await request(server)
            .post('/events')
            .send({
                event: 'smoke_test_run',
                sessionId: 'smoke-session-123',
                context: { environment: 'test' },
                meta: { client: 'smoke-runner' }
            });
        assert(trackRes.status === 201, `POST /events should return 201 Created (Got ${trackRes.status})`);
        assert(trackRes.body?.ok === true, `POST /events response ok should be true`);

        // --- 5. Protected Route Semantics (without Token) ---
        console.log('\n--- 5. Protected Endpoints (Anonymous Access Blocked) ---');
        const userTodayNoAuth = await request(server).get('/user/today');
        assert(userTodayNoAuth.status === 401, `GET /user/today without token should return 401 (Got ${userTodayNoAuth.status})`);

        const adminOverviewNoAuth = await request(server).get('/admin/overview');
        assert(adminOverviewNoAuth.status === 401, `GET /admin/overview without token should return 401 (Got ${adminOverviewNoAuth.status})`);

        // Check if database is active for DB-dependent tests
        let hasDbConnection = false;
        try {
            await prisma.user.findFirst();
            hasDbConnection = true;
        } catch (e) {
            // Prisma error/disconnect
        }

        if (!hasDbConnection) {
            console.log('\n⚠️ Database is down/running in limited mode. Skipping user & admin role-based checks.');
            skipped += 4;
        } else {
            console.log('\n--- 6. User and Admin Auth Checks (Database Available) ---');
            
            const userEmail = `user-smoke-${Date.now()}@example.com`;
            const adminEmail = `admin-smoke-${Date.now()}@example.com`;

            // Clean-create user and admin in DB
            const dbUser = await prisma.user.create({
                data: { email: userEmail, plan: 'member', role: 'user' }
            });
            await prisma.userState.create({
                data: { userId: dbUser.id, profileType: 'a_type', programId: 'circadian-reset' }
            });

            const dbAdmin = await prisma.user.create({
                data: { email: adminEmail, plan: 'admin', role: 'admin' }
            });

            // Log in as normal user
            const userLogin = await request(server).post('/auth/login').send({ email: userEmail });
            const userToken = userLogin.body?.access_token;
            assert(!!userToken, 'User login should return a valid JWT token');

            // Log in as admin
            const adminLogin = await request(server).post('/auth/login').send({ email: adminEmail });
            const adminToken = adminLogin.body?.access_token;
            assert(!!adminToken, 'Admin login should return a valid JWT token');

            // User gets their own info
            const userTodayRes = await request(server)
                .get('/user/today')
                .set('Authorization', `Bearer ${userToken}`);
            assert(userTodayRes.status === 200, `GET /user/today as Member should return 200 (Got ${userTodayRes.status})`);

            // User accesses admin endpoint (Forbidden)
            const userAdminRes = await request(server)
                .get('/admin/overview')
                .set('Authorization', `Bearer ${userToken}`);
            assert(userAdminRes.status === 403, `GET /admin/overview as Member should return 403 Forbidden (Got ${userAdminRes.status})`);

            // Admin accesses admin endpoint (Success)
            const adminOverviewRes = await request(server)
                .get('/admin/overview')
                .set('Authorization', `Bearer ${adminToken}`);
            assert(adminOverviewRes.status === 200, `GET /admin/overview as Admin should return 200 OK (Got ${adminOverviewRes.status})`);

            // --- 7. Allowlist Enforcement Checks ---
            console.log('\n--- 7. Allowlist Enforcement checks ---');
            
            // Set env vars
            process.env.BETA_ALLOWLIST_REQUIRED = 'true';
            process.env.BETA_ALLOWLIST = `allowed-tester@example.com,${userEmail}`;

            // Try allowed tester login (should pass)
            const allowedLogin = await request(server).post('/auth/login').send({ email: 'allowed-tester@example.com' });
            assert(allowedLogin.status === 201, `Login as allowed tester should return 201 (Got ${allowedLogin.status})`);
            assert(!!allowedLogin.body?.access_token, 'Allowed tester login should return token');

            // Try disallowed tester login (should return 401)
            const blockedLogin = await request(server).post('/auth/login').send({ email: 'blocked-tester@example.com' });
            assert(blockedLogin.status === 401, `Login as non-allowlisted tester should return 401 Unauthorized (Got ${blockedLogin.status})`);

            // Restore env vars
            process.env.BETA_ALLOWLIST_REQUIRED = 'false';
            delete process.env.BETA_ALLOWLIST;

            // --- 8. State Sync, Assessment and Duplicate Logging Checks ---
            console.log('\n--- 8. State Sync, Assessment, and Duplicate Logging Checks ---');

            // Clean-create an onboarding test user
            const testOnboardEmail = `onboard-${Date.now()}@example.com`;
            const dbOnboardUser = await prisma.user.create({
                data: { email: testOnboardEmail, plan: 'member', role: 'user' }
            });
            const onboardLogin = await request(server).post('/auth/login').send({ email: testOnboardEmail });
            const onboardToken = onboardLogin.body?.access_token;

            // Submit Onboarding Assessment
            const assessmentRes = await request(server)
                .post('/assessment')
                .set('Authorization', `Bearer ${onboardToken}`)
                .send({
                    primary_goal: 'sleep_quality',
                    sleep_issue_type: ['difficulty_falling'],
                    low_energy_window: '15:00-17:00',
                    bedtime: '23:00',
                    caffeine_time: '08:30',
                    dinner_time: '20:00',
                    symptoms: ['morning_fatigue'],
                    constraints: []
                });
            assert(assessmentRes.status === 201, `Submit assessment should return 201 (Got ${assessmentRes.status})`);

            // Check that UserBehaviorState was initialized
            const initialBehaviorState = await prisma.userBehaviorState.findUnique({
                where: { userId: dbOnboardUser.id }
            });
            assert(!!initialBehaviorState, 'UserBehaviorState should be initialized on assessment submission');
            assert(initialBehaviorState?.dayIndex === 1, 'Initial dayIndex should be 1');

            // Get Today Page Loads
            const todayRes = await request(server)
                .get('/user/today')
                .set('Authorization', `Bearer ${onboardToken}`);
            assert(todayRes.status === 200, `GET /user/today should return 200 OK (Got ${todayRes.status})`);
            assert(todayRes.body?.uiMode === 'PROTOCOL', `uiMode should be PROTOCOL (Got ${todayRes.body?.uiMode})`);

            // Submit Day Log for Day 1
            const logRes = await request(server)
                .post('/user/day-log')
                .set('Authorization', `Bearer ${onboardToken}`)
                .send({
                    day: 1,
                    action_completed: true,
                    self_report_effect: { value: 'better' }
                });
            assert(logRes.status === 201, `Submit daily log should return 201 (Got ${logRes.status})`);
            assert(logRes.body?.ok === true, 'Response ok should be true');

            // Verify UserState and UserBehaviorState day indices are updated and synchronized
            const updatedUserState = await prisma.userState.findUnique({
                where: { userId: dbOnboardUser.id }
            });
            const updatedBehaviorState = await prisma.userBehaviorState.findUnique({
                where: { userId: dbOnboardUser.id }
            });
            assert(updatedUserState?.currentDay === 2, `UserState currentDay should advance to 2 (Got ${updatedUserState?.currentDay})`);
            assert(updatedBehaviorState?.dayIndex === 2, `UserBehaviorState dayIndex should sync to 2 (Got ${updatedBehaviorState?.dayIndex})`);

            // Verify Duplicate protection prevents re-submitting for the same day
            const dupLogRes = await request(server)
                .post('/user/day-log')
                .set('Authorization', `Bearer ${onboardToken}`)
                .send({
                    day: 1,
                    action_completed: true,
                    self_report_effect: { value: 'better' }
                });
            assert(dupLogRes.status === 201, `Duplicate daily log post should return 201 (Got ${dupLogRes.status})`);
            assert(dupLogRes.body?.ok === false, 'Duplicate daily log response ok should be false');
            assert(dupLogRes.body?.error === 'DUPLICATE_SUBMISSION', `Duplicate error should be DUPLICATE_SUBMISSION (Got ${dupLogRes.body?.error})`);

            // --- 9. Telemetry Privacy Sanitization Checks (Database Available) ---
            console.log('\n--- 9. Telemetry Privacy Sanitization Checks ---');
            const sensitiveEventRes = await request(server)
                .post('/events')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    event: 'day_completed',
                    context: {
                        day: 2,
                        feedback: 'extremely sensitive comments here',
                        symptoms: 'feeling tired',
                        caffeine_time: '12:00',
                        streak: 7
                    }
                });
            assert(sensitiveEventRes.status === 201, `POST /events with sensitive context should return 201 (Got ${sensitiveEventRes.status})`);

            const savedEvent = await prisma.event.findFirst({
                where: { userId: dbUser.id, event: 'day_completed' }
            });
            assert(!!savedEvent, 'Sensitive event should be successfully logged in the database');
            const savedContext = savedEvent?.context as any;
            assert(savedContext?.day === 2, 'Non-sensitive key "day" must be preserved');
            assert(savedContext?.streak === 7, 'Non-sensitive key "streak" must be preserved');
            assert(savedContext?.feedback === undefined, 'Sensitive key "feedback" must be sanitized and removed');
            assert(savedContext?.symptoms === undefined, 'Sensitive key "symptoms" must be sanitized and removed');
            assert(savedContext?.caffeine_time === undefined, 'Sensitive key "caffeine_time" must be sanitized and removed');

            // Cleanup test data
            await prisma.userState.deleteMany({ where: { userId: { in: [dbUser.id, dbAdmin.id, dbOnboardUser.id] } } });
            await prisma.userBehaviorState.deleteMany({ where: { userId: { in: [dbUser.id, dbAdmin.id, dbOnboardUser.id] } } });
            await prisma.event.deleteMany({ where: { userId: { in: [dbUser.id, dbAdmin.id, dbOnboardUser.id] } } });
            await prisma.user.deleteMany({ where: { id: { in: [dbUser.id, dbAdmin.id, dbOnboardUser.id] } } });
        }

    } catch (e: any) {
        console.error('Smoke test runner encountered an unexpected crash:', e);
        failures++;
    } finally {
        await app.close();
    }

    console.log('\n==================================================');
    console.log(`SMOKE TESTS COMPLETED: ${passes} Passed, ${failures} Failed, ${skipped} Skipped`);
    console.log('==================================================');

    if (failures > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runSmokeTests().catch((e) => {
    console.error('Fatal crash running smoke tests:', e);
    process.exit(1);
});
