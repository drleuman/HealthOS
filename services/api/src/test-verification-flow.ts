
import { PrismaClient } from '@prisma/client';

const API_URL = 'http://localhost:3001';
const prisma = new PrismaClient();

async function runVerification() {
    console.log("--- STARTING VERIFICATION (HTTP + DB) ---");
    const TEST_EMAIL = `verify-http-${Date.now()}@example.com`;

    try {
        // 1. Create User via Auth Endpoint (or just DB for speed if Auth is complex)
        // Let's use DB to force a clean state
        console.log(`1. Creating user in DB: ${TEST_EMAIL}`);
        const user = await prisma.user.create({
            data: { email: TEST_EMAIL, plan: 'member' }
        });

        // Initialize State
        await prisma.userState.create({
            data: {
                userId: user.id,
                profileType: 'b_type',
                programId: 'circadian-reset',
                currentDay: 1,
                streak: 0
            }
        });

        // 2. Perform Log via API (This tests HealthService -> BehaviorService wiring)
        console.log("2. Sending POST /user/day-log (Action Completed + Worse)...");

        // We need a mock Token? 
        // If Auth is enabled, we need a token.
        // Let's generate a token or mock the Auth? 
        // The project uses `JwtAuthGuard`.
        // We can use the `AuthService` to sign a token if we can import it, OR
        // we can just login via API.

        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
        const { access_token } = await loginRes.json();
        console.log("   Got Token:", access_token.substring(0, 20) + "...");

        const logRes = await fetch(`${API_URL}/user/day-log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            body: JSON.stringify({
                day: 1,
                action_completed: true,
                self_report_effect: { effect: 'worse', note: 'Headache' }
            })
        });

        if (!logRes.ok) throw new Error(`Log failed: ${status} ${await logRes.text()}`);
        const logData = await logRes.json();
        console.log("   Log Response:", JSON.stringify(logData, null, 2));

        // 3. Verify Database Analysis
        console.log("3. Verifying BehaviorAnalysis in DB...");
        // Wait a moment for async processing if any (though processDailyLog matches await)
        const analysis = await prisma.behaviorAnalysis.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        if (!analysis) throw new Error("No Analysis Record Found!");

        console.log("   Signal:", analysis.primarySignal);
        console.log("   Response Type:", analysis.systemResponseType);
        console.log("   Generated Message:", analysis.generatedMessage);

        const passSignal = analysis.primarySignal === 'adaptation_response';
        const passResponse = analysis.systemResponseType === 'normalization';

        if (passSignal && passResponse) {
            console.log("\n✅ VERIFICATION SUCCESS: System correctly interpreted 'Worse' as Adaptation/Normalization.");
        } else {
            console.error(`\n❌ VERIFICATION FAIL: Expected adaptation_response/normalization. Got ${analysis.primarySignal}/${analysis.systemResponseType}`);
        }

    } catch (e: any) {
        console.error("\n❌ SCRIPT ERROR:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

runVerification();
