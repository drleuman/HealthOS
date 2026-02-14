/**
 * SER Scenario Simulation & Validation Test (MOCKED) v2
 * 
 * Tests the classification logic of SER (Spontaneous Engagement Return)
 * against 5 canonical scenarios by mocking the Prisma Service.
 * 
 * Supports new Cohortization structure.
 * 
 * Run with: npx ts-node src/analytics/test-ser-scenarios.ts
 */

import { SERService } from './ser.service';

async function runMockedScenarioTest() {
    console.log(`\n🚀 Starting SER Deterministic Validation (MOCKED) v2...\n`);

    // Mock Prisma Service
    const mockPrisma: any = {
        user: {
            findMany: jest.fn()
        },
        event: {
            findMany: jest.fn(),
            count: jest.fn()
        },
        operatorInteraction: {
            count: jest.fn()
        }
    };

    // Initialize Service with mock
    const serService = new SERService(mockPrisma);

    const now = new Date();
    const ago = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

    const testUsers = [
        { id: 'user1', email: 'v1@test.com', createdAt: ago(100), state: { experimentGroup: 'treatment' } },
        { id: 'user2', email: 'v2@test.com', createdAt: ago(100), state: { experimentGroup: 'control' } },
        { id: 'user3', email: 'v3@test.com', createdAt: ago(100), state: { experimentGroup: 'treatment' } },
        { id: 'user4', email: 'v4@test.com', createdAt: ago(100), state: { experimentGroup: 'control' } },
        { id: 'user5', email: 'v5@test.com', createdAt: ago(100), state: { experimentGroup: 'treatment' } }
    ];

    // Setup mocks
    mockPrisma.user.findMany.mockResolvedValue(testUsers);

    // Scenario 1: Valid Return 30h (KEEP)
    const events1 = [
        { userId: 'user1', event: 'day_started', timestamp: ago(60) },
        { userId: 'user1', event: 'app_opened', timestamp: ago(30) }
    ];

    // Scenario 2: Discard: Intervention in Prev Session (DISCARD)
    const events2 = [
        { userId: 'user2', event: 'day_started', timestamp: ago(60) },
        { userId: 'user2', event: 'micro_intervention_shown', timestamp: ago(59) },
        { userId: 'user2', event: 'app_opened', timestamp: ago(30) }
    ];

    // Scenario 3: Discard: Operator Window (DISCARD)
    const events3 = [
        { userId: 'user3', event: 'day_started', timestamp: ago(60) },
        { userId: 'user3', event: 'app_opened', timestamp: ago(30) }
    ];

    // Scenario 4: Ignore: Continuity 1h (IGNORE/NOT SER)
    const events4 = [
        { userId: 'user4', event: 'day_started', timestamp: ago(31) },
        { userId: 'user4', event: 'app_opened', timestamp: ago(30) }
    ];

    // Scenario 5: Discard: Within First Day (DISCARD)
    const events5 = [
        { userId: 'user5', event: 'day_started', timestamp: ago(10) },
        { userId: 'user5', event: 'app_opened', timestamp: ago(5) }
    ];

    mockPrisma.event.findMany.mockImplementation(({ where }: any) => {
        if (where.userId === 'user1') return Promise.resolve(events1);
        if (where.userId === 'user2') return Promise.resolve(events2);
        if (where.userId === 'user3') return Promise.resolve(events3);
        if (where.userId === 'user4') return Promise.resolve(events4);
        if (where.userId === 'user5') return Promise.resolve(events5);
        return Promise.resolve([]);
    });

    mockPrisma.operatorInteraction.count.mockImplementation(({ where }: any) => {
        if (where.userId === 'user3' && where.createdAt.gte.getTime() === ago(54).getTime()) return Promise.resolve(1);
        if (where.userId === 'user3' && where.createdAt.gte.getTime() === ago(48).getTime()) return Promise.resolve(1);
        return Promise.resolve(0);
    });

    mockPrisma.event.count.mockResolvedValue(0);

    // Run Analysis
    const result = await serService.computeSERDistribution(ago(120), now);

    const scenarios = [
        { Scenario: 'KEEP: Valid Return 30h', Expected: 'KEEP', User: 'user1' },
        { Scenario: 'DISCARD: Prev Intervention', Expected: 'DISCARD', User: 'user2' },
        { Scenario: 'DISCARD: Operator Window', Expected: 'DISCARD', User: 'user3' },
        { Scenario: 'IGNORE: Short gap (<2h)', Expected: 'IGNORE', User: 'user4' },
        { Scenario: 'DISCARD: First Day Window', Expected: 'DISCARD', User: 'user5' }
    ];

    const report = scenarios.map(s => {
        const log = result.logs.find(l => l.includes(s.User));
        let actual = 'IGNORE';
        if (log?.includes('KEEP')) actual = 'KEEP';
        else if (log?.includes('Discarded')) actual = 'DISCARD';

        return {
            ...s,
            Actual: actual,
            Status: actual === s.Expected ? 'PASS' : 'FAIL'
        };
    });

    console.table(report);

    console.log(`\nCohort Verification:`);
    console.log(`- Treatment Group N: ${result.cohorts.treatment.effectiveN} (Exp 2: user1, user3)`);
    console.log(`- Control Group N: ${result.cohorts.control.effectiveN} (Exp 1: user2)`);
    console.log(`- Contacted Group N: ${result.cohorts.contacted.effectiveN} (Exp 1: user3)`);
    console.log(`- Untouched Group N: ${result.cohorts.untouched.effectiveN} (Exp 2: user1, user2)`);

    const passed = report.filter(r => r.Status === 'PASS').length;
    const cohortPass =
        result.cohorts.treatment.effectiveN === 2 &&
        result.cohorts.control.effectiveN === 1 &&
        result.cohorts.contacted.effectiveN === 1 &&
        result.cohorts.untouched.effectiveN === 2;

    if (passed === scenarios.length && result.spontaneousReturns === 1 && result.effectiveN === 3 && cohortPass) {
        console.log(`\n✅ SER COHORT VALIDATION PASSED\n`);
    } else {
        console.log(`\n❌ SER COHORT VALIDATION FAILED: Passed=${passed}/${scenarios.length}, Returns=${result.spontaneousReturns}, N=${result.effectiveN}, CohortPass=${cohortPass}\n`);
        process.exit(1);
    }
}

const jest = {
    fn: (implementation?: any) => {
        const fn: any = (...args: any[]) => {
            fn.mock.calls.push(args);
            return fn.mock.implementation(...args);
        };
        fn.mock = { calls: [], implementation: implementation || (() => Promise.resolve()) };
        fn.mockImplementation = (newImpl: any) => {
            fn.mock.implementation = newImpl;
            return fn;
        };
        fn.mockResolvedValue = (val: any) => {
            fn.mock.implementation = () => Promise.resolve(val);
            return fn;
        };
        return fn;
    }
};

runMockedScenarioTest();
