
/**
 * Test script for Behavior Engine Logic
 * 
 * To run: npx ts-node services/api/src/test-behavior-logic.ts
 */

import { BehaviorService } from './behavior.service';
import { PrismaService } from './prisma.service';

// Mock Prisma
const createMockFn = () => {
    const f: any = () => { };
    f.mockResolvedValue = (v: any) => { f.v = v; return f; };
    f.mockClear = () => { f.mock.calls = []; };
    f.mock = { calls: [] };
    // Shim implementation when called
    f.mockImplementation = (cb: any) => { f.impl = cb; return f; };
    return f;
};

const mockPrisma = {
    dailyLog: {
        findMany: createMockFn()
    },
    event: {
        findMany: createMockFn(),
        findFirst: createMockFn()
    },
    userBehaviorSnapshot: {
        upsert: createMockFn(),
        create: createMockFn(),
        findFirst: createMockFn(),
    },
    userBehaviorState: {
        upsert: createMockFn()
    }
} as any;

const mockInterpreter = { interpret: createMockFn() } as any;
const mockStateEngine = { updateState: createMockFn() } as any;
const mockMessageGen = { generateMessage: createMockFn() } as any;
const mockProtocolEngine = { executeAction: createMockFn() } as any;

const service = new BehaviorService(
    mockPrisma,
    mockInterpreter,
    mockStateEngine,
    mockMessageGen,
    mockProtocolEngine
);

// Shim logic: Manually attach spy behavior because we are not using Jest
function attachSpy(obj: any) {
    if (!obj) return;
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (typeof val === 'function' && val.mock) {
            // It's a mock fn creator, wrap it
            const original = val;
            const spy = function (...args: any[]) {
                spy.mock.calls.push(args);
                return Promise.resolve(original.v);
            } as any;
            spy.mockResolvedValue = (v: any) => { original.v = v; return spy; };
            spy.mockClear = () => { spy.mock.calls = []; };
            spy.mock = { calls: [] };
            obj[key] = spy;
        } else if (typeof val === 'object') {
            attachSpy(val);
        }
    });
}
attachSpy(mockPrisma);

async function testActionTooHard() {
    console.log("Test: Action Too Hard");

    // Setup Mock: 2 started (different days), 0 completed
    const day1 = new Date(); day1.setDate(day1.getDate() - 2);
    const day2 = new Date(); day2.setDate(day2.getDate() - 1);

    mockPrisma.event.findMany.mockResolvedValue([
        { event: 'day_started', timestamp: day1 },
        { event: 'day_started', timestamp: day2 }
    ]);
    // dailyLog is not used anymore
    mockPrisma.dailyLog.findMany.mockResolvedValue([]);

    // Inactivity: Active recently
    mockPrisma.event.findFirst.mockResolvedValue({ timestamp: new Date() });

    // Run Aggregate
    await service.computeSnapshotForUser('user1', new Date());

    // Verify Snapshot Creation payload
    const createCall = mockPrisma.userBehaviorSnapshot.upsert.mock.calls[0][0]; // Changed to upsert
    console.log("  Snapshot:", createCall.create);

    if (createCall.create.startedDaysLast7 === 2 && createCall.create.completedDaysLast7 === 0) {
        console.log("  PASS: Snapshot metrics correct");
    } else {
        console.error("  FAIL: Snapshot metrics incorrect");
    }

    // Setup Mock for Determination
    // DetermineState now expects an object, not DB call necessarily? 
    // Wait, DetermineState takes `snapshot` object.
    const snap = createCall.create;

    // Run Determination
    const state = await service.determineState(snap);
    console.log("  State:", state);

    if (state === 'action_too_hard') {
        console.log("  PASS: Detected 'action_too_hard'");
    } else {
        console.error("  FAIL: Expected 'action_too_hard'");
    }
}

async function testInstructionUnclear() {
    console.log("\nTest: Instruction Unclear");
    mockPrisma.userBehaviorSnapshot.upsert.mockClear();

    // Setup: 3 openings, 0 completed
    mockPrisma.dailyLog.findMany.mockResolvedValue([]);
    mockPrisma.event.findMany.mockResolvedValue([
        { event: 'day_started', timestamp: new Date() },
        { event: 'day_started', timestamp: new Date() },
        { event: 'day_started', timestamp: new Date() }
    ]);
    mockPrisma.event.findFirst.mockResolvedValue({ timestamp: new Date() });

    await service.computeSnapshotForUser('user2', new Date());
    const snap = mockPrisma.userBehaviorSnapshot.upsert.mock.calls[0][0].create;

    // Inject snap for determination (not needed as we pass object directly now)

    const state = await service.determineState(snap);
    console.log("  State:", state);
    if (state === 'instruction_unclear') console.log("  PASS");
    else console.error("  FAIL");
}

async function run() {
    try {
        await testActionTooHard();
        await testInstructionUnclear();
    } catch (e) {
        console.error(e);
    }
}

// Minimal Jest Mock
run().then(() => {
    console.log("Completed behavioral verification.");
});
