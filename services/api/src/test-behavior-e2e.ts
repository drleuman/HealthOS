
/**
 * E2E Verification Script for Behavior Engine & Interventions
 * 
 * To run: npx ts-node services/api/src/test-behavior-e2e.ts
 */

import { PrismaService } from './prisma.service';

async function runE2E() {
    const prisma = new PrismaService();
    const TEST_EMAIL = `e2e-behavior-${Date.now()}@example.com`;
    const ANALYTICS_SECRET = process.env.ANALYTICS_SECRET || 'admin-secret-dev';
    const API_URL = process.env.API_URL || 'http://localhost:3001';

    console.log("--- STARTING BEHAVIOR → INTERVENTIONS E2E ---");

    try {
        // 1. Create Test User and get JWT
        console.log(`1. Creating/Login test user: ${TEST_EMAIL}`);
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL })
        });
        const { token } = await loginRes.json();

        // Find user id
        const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
        if (!user) throw new Error("User not created after login");

        // 2. Insert Simulated Events ('instruction_unclear' scenario)
        // Definition: 3+ opens of same day today, 0 completed
        console.log("2. Inserting simulated events ('instruction_unclear' scenario)");
        const today = new Date();

        await prisma.event.createMany({
            data: [
                { userId: user.id, event: 'day_viewed', timestamp: today, context: { day: 5 } },
                { userId: user.id, event: 'day_viewed', timestamp: today, context: { day: 5 } },
                { userId: user.id, event: 'day_viewed', timestamp: today, context: { day: 5 } },
            ]
        });

        // 3. Trigger Analysis Job via Internal API
        console.log("3. Triggering Analysis Job...");
        const analysisResponse = await fetch(`${API_URL}/internal/behavior/analyse`, {
            method: 'POST',
            headers: { 'x-analytics-secret': ANALYTICS_SECRET }
        });

        if (!analysisResponse.ok) {
            const errBody = await analysisResponse.text();
            throw new Error(`Analysis Trigger Failed: ${analysisResponse.status} - ${errBody}`);
        }

        const jobResult = await analysisResponse.json();
        console.log("   Job Result processed count:", jobResult.processed);

        // 4. Verify /user/today includes behavior and intervention
        console.log("4. Verifying /user/today response...");
        const todayResponse = await fetch(`${API_URL}/user/today`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await todayResponse.json();

        console.log("   Behavior State:", result.behavior?.state);
        console.log("   Intervention:", result.microIntervention?.type);

        // Validation
        const isInstructionUnclear = result.behavior?.state === 'instruction_unclear';
        const hasClarifyIntervention = result.microIntervention?.type === 'clarify' && result.microIntervention?.mode === 'simplified';

        if (isInstructionUnclear && hasClarifyIntervention) {
            console.log("✅ PASS: Correct state and 'clarify' intervention returned.");
        } else {
            console.error(`❌ FAIL: Verification failed. State=${result.behavior?.state}, Intervention=${result.microIntervention?.type}`);
        }

        // 5. Verify tracking of intervention exposure
        console.log("5. Verifying exposure tracking in DB...");
        const exposureEvent = await prisma.event.findFirst({
            where: {
                userId: user.id,
                event: 'intervention_recommended'
            }
        });

        if (exposureEvent) {
            console.log("✅ PASS: 'intervention_recommended' event found in DB.");
        } else {
            console.error("❌ FAIL: Exposure event NOT found in DB.");
        }

        // Cleanup
        console.log("6. Cleaning up...");
        await prisma.user.delete({ where: { id: user.id } });

    } catch (e: any) {
        console.error("❌ E2E ERROR:", e.message);
        console.log("Tip: Ensure the API server is running at", API_URL);
    } finally {
        await prisma.$disconnect();
        console.log("--- E2E COMPLETE ---");
    }
}

if (typeof fetch === 'undefined') {
    console.error("Node.js 18+ required for built-in fetch.");
} else {
    runE2E();
}
