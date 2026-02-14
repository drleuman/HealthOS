import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';

async function runTest() {
    console.log('Starting Tracking E2E Test...');

    // Setup app
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    const server = app.getHttpServer();
    const prisma = app.get(PrismaService);

    try {
        // --- Step 1: Login ---
        console.log('\n--- 1. Login ---');
        const email = `track-${Date.now()}@example.com`;
        const loginRes = await request(server).post('/auth/login').send({ email });
        const token = loginRes.body.access_token;
        const userId = loginRes.body.user.id; // Assuming user obj returns id
        console.log(`User created: ${userId}`);

        // --- Step 2: Track Authenticated Event ---
        console.log('\n--- 2. Track Authenticated Event ---');
        const authEventName = `auth_event_${Date.now()}`;
        await request(server)
            .post('/events')
            .set('Authorization', `Bearer ${token}`)
            .send({ event: authEventName, context: { test: true } })
            .expect(201);

        // Wait a bit for async processing
        await new Promise(r => setTimeout(r, 500));

        const authEvent = await prisma.event.findFirst({
            where: { event: authEventName }
        });

        if (authEvent && authEvent.userId === userId) {
            console.log('✅ Authenticated event stored with correct userId');
        } else {
            console.error('❌ Authenticated event verification failed', authEvent);
            process.exit(1);
        }

        // --- Step 3: Track Anonymous Event ---
        console.log('\n--- 3. Track Anonymous Event ---');
        const anonEventName = `anon_event_${Date.now()}`;
        await request(server)
            .post('/events')
            .send({ event: anonEventName })
            .expect(201);

        await new Promise(r => setTimeout(r, 500));

        const anonEvent = await prisma.event.findFirst({
            where: { event: anonEventName }
        });

        if (anonEvent && anonEvent.userId === null) {
            console.log('✅ Anonymous event stored with null userId');
        } else {
            console.error('❌ Anonymous event verification failed', anonEvent);
            process.exit(1);
        }

        // --- Step 4: Verify Analytics Protection ---
        console.log('\n--- 4. Verify Analytics Protection ---');

        // 4a. No Auth
        await request(server)
            .get('/events/analytics/activation')
            .expect(403);
        console.log('✅ Blocked request without auth');

        // 4b. With Secret
        const adminSecret = process.env.ANALYTICS_SECRET || 'admin-secret-dev';
        await request(server)
            .get('/events/analytics/activation')
            .set('X-Analytics-Secret', adminSecret)
            .expect(200);
        console.log('✅ Allowed request with secret');

        console.log('\n🎉 ALL TRACKING TESTS PASSED');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await app.close();
    }
}

runTest();
