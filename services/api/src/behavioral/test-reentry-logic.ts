
import { PerceptionInterpreter } from './perception.interpreter';
import { StateEngine } from './state.engine';
import { BehaviorContextV1 } from './types/behavior-context';

async function runEdgeTests() {
    console.log("--- BORDER TESTS: Re-entry Stability ---");

    const interpreter = new PerceptionInterpreter();
    const mockPrisma = {
        userBehaviorState: { findUnique: (args: any) => Promise.resolve(null) },
        userState: { findUnique: (args: any) => Promise.resolve({ programId: 'p1', currentDay: 1 }) },
        upsert: (args: any) => Promise.resolve({}),
        dailyLog: { findMany: () => Promise.resolve([]) }
    } as any;

    // --- TEST A: Cooldown non-sliding ---
    console.log("\nA) Cooldown non-sliding");
    const stateEngine = new StateEngine(mockPrisma);
    const now = new Date();
    const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5).toISOString(); // 5 days in future

    let ctx: BehaviorContextV1 = {
        version: 1,
        deviation: {
            type: 'DRIFT',
            severity: 0.8,
            active: true,
            triggeredAt: now.toISOString(),
            lastEvaluatedAt: now.toISOString(),
            ruleId: 'DEV_DRIFT_3W_7D_DENSE',
            evalCount: 1
        },
        reentry: {
            suggestedAt: now.toISOString(),
            cooldownUntil: future,
            suggestionCount: 1
        }
    };

    const currentState = {
        userId: 'u1',
        status: 'COMPLETED',
        context: ctx,
        updatedAt: now
    };

    mockPrisma.userBehaviorState.findUnique = () => Promise.resolve(currentState);

    const analysis: any = {
        signal: 'consistent_execution',
        phaseProgress: 'maintenance',
        recommendedResponse: 'observation',
        protocolAction: 'repeat',
        deviation: { type: 'DRIFT', severity: 0.8, ruleId: 'DEV_DRIFT_3W_7D_DENSE', at: now.toISOString() }
    };

    let capturedUpsert: any = null;
    mockPrisma.userBehaviorState.upsert = (args: any) => {
        capturedUpsert = args.update;
        return Promise.resolve({});
    };

    await stateEngine.updateState('u1', analysis, ctx, { gapHours: 24 });

    const updatedCtx = capturedUpsert.context as BehaviorContextV1;
    const cooldownPass = updatedCtx.reentry?.cooldownUntil === future;
    const countPass = updatedCtx.reentry?.suggestionCount === 1;
    console.log(`  Cooldown remains: ${cooldownPass ? "PASS" : "FAIL (" + updatedCtx.reentry?.cooldownUntil + ")"}`);
    console.log(`  Suggestion count stable: ${countPass ? "PASS" : "FAIL"}`);


    // --- TEST B: Density guard ---
    console.log("\nB) Density guard correctness");

    const baseAt = new Date("2026-02-15T12:00:00Z");
    const logsB1 = [
        { effect: 'worse', at: baseAt.toISOString() }, // T=0 (latest)
        { effect: 'worse', at: new Date(baseAt.getTime() - 48 * 36e5).toISOString() }, // T=-48h
        { effect: 'worse', at: new Date(baseAt.getTime() - 120 * 36e5).toISOString() }, // T=-120h (span 120h)
    ];

    const inputB1: any = {
        userId: 'u1',
        day: 20,
        feedback: 'worse',
        metrics: {
            checkEffectHistoryWithTime: logsB1,
            gapHours: 24
        },
        context: { protocolStatus: 'COMPLETED' }
    };

    const outB1 = await interpreter.interpret(inputB1);
    console.log("  Case B1 (3 logs, 120h span, 7d window) -> Drift:", outB1.deviation ? "FAIL (Should be blocked by density)" : "PASS (No Drift)");

    const logsB2 = [
        { effect: 'worse', at: baseAt.toISOString() }, // T=0 (latest)
        { effect: 'worse', at: new Date(baseAt.getTime() - 48 * 36e5).toISOString() }, // T=-48h
        { effect: 'worse', at: new Date(baseAt.getTime() - 120 * 36e5).toISOString() }, // T=-120h (span 120h > 72h)
        { effect: 'same', at: new Date(baseAt.getTime() - 144 * 36e5).toISOString() } // T=-144h (4 logs in window)
    ];
    inputB1.metrics.checkEffectHistoryWithTime = logsB2;
    const outB2 = await interpreter.interpret(inputB1);
    console.log("  Case B2 (3 worse, 120h span, 4 logs in window) -> Drift:", outB2.deviation?.type === 'DRIFT' ? "PASS" : "FAIL");


    // --- TEST C: Clear hysteresis ---
    console.log("\nC) Clear hysteresis");

    const ctxC: BehaviorContextV1 = {
        version: 1,
        deviation: { type: 'DRIFT', severity: 0.8, active: true, triggeredAt: now.toISOString(), lastEvaluatedAt: now.toISOString(), ruleId: 'x' }
    };
    currentState.context = ctxC;

    // Transition: Feed worse (latest), same, better. last2 = [worse, same]
    const metricsC1 = { checkEffectHistory: ['worse', 'same', 'better'], gapHours: 24 };
    const analysisC1: any = { signal: 'consistent_execution', deviation: null };

    await stateEngine.updateState('u1', analysisC1, ctxC, metricsC1);
    const updatedCtxC1 = capturedUpsert.context as BehaviorContextV1;
    console.log("  Feed [worse, same, better] (latest-first) -> Drift active:", updatedCtxC1.deviation?.active ? "PASS" : "FAIL");

    // Feed same (latest), better. last2 = [same, better]
    const metricsC2 = { checkEffectHistory: ['same', 'better'], gapHours: 24 };
    await stateEngine.updateState('u1', analysisC1, ctxC, metricsC2);
    const updatedCtxC2 = capturedUpsert.context as BehaviorContextV1;
    console.log("  Feed [same, better] (latest-first) -> Drift cleared:", !updatedCtxC2.deviation?.active ? "PASS" : "FAIL");

    // Feed same, better but gap too high
    const metricsC3 = { checkEffectHistory: ['same', 'better'], gapHours: 200 };
    await stateEngine.updateState('u1', analysisC1, ctxC, metricsC3);
    const updatedCtxC3 = capturedUpsert.context as BehaviorContextV1;
    console.log("  Feed [same, better] but gap=200 -> Drift active:", updatedCtxC3.deviation?.active ? "PASS" : "FAIL");


    // --- TEST D: Ordering invariant ---
    console.log("\nD) Ordering invariant");
    const logsD = [
        { effect: 'worse', at: "2026-02-15T12:00:00Z" },
        { effect: 'worse', at: "2026-02-15T11:00:00Z" },
        { effect: 'worse', at: "2026-02-15T10:00:00Z" }
    ];
    const inputD: any = {
        metrics: { checkEffectHistoryWithTime: logsD, gapHours: 1 },
        context: { protocolStatus: 'COMPLETED' }
    };
    const outD1 = await interpreter.interpret(inputD);

    inputD.metrics.checkEffectHistoryWithTime = [logsD[1], logsD[2], logsD[0]];
    const outD2 = await interpreter.interpret(inputD);
    console.log("  Random order same result:", outD1.deviation?.ruleId === outD2.deviation?.ruleId ? "PASS" : "FAIL");

    console.log("\n--- BORDER TESTS COMPLETED ---");
}

runEdgeTests();
