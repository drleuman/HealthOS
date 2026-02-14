import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';

async function runTest() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app: INestApplication = moduleFixture.createNestApplication();
    await app.init();

    const email = `test-${Date.now()}@example.com`;
    let token: string;

    console.log('--- Step 1: Login/Onboarding ---');
    const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email });

    token = loginRes.body.access_token;
    console.log('Login Result:', loginRes.status, !!token);

    console.log('\n--- Step 2: Submit Assessment ---');
    const assessRes = await request(app.getHttpServer())
        .post('/assessment')
        .set('Authorization', `Bearer ${token}`)
        .send({
            primary_goal: 'sleep',
            bedtime: '23:00',
            caffeine_time: '14:00',
            dinner_time: '20:00'
        });
    console.log('Assessment Result:', assessRes.status, assessRes.body.program_id);

    console.log('\n--- Step 3: Get Today ---');
    const todayRes = await request(app.getHttpServer())
        .get('/user/today')
        .set('Authorization', `Bearer ${token}`);
    console.log('Today Result:', todayRes.status, 'Day:', todayRes.body.day);

    console.log('\n--- Step 4: Log Day ---');
    const logRes = await request(app.getHttpServer())
        .post('/user/day-log')
        .set('Authorization', `Bearer ${token}`)
        .send({
            day: todayRes.body.day,
            action_completed: true
        });
    console.log('Log Day Result:', logRes.status, 'Next Day:', logRes.body.currentDay);

    await app.close();
}

runTest().catch(console.error);
