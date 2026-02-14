
/**
 * Experiment Hash Distribution Test
 * Verifies that the deterministic hash fairly assigns 80% to treatment and 20% to control.
 */

import { ExperimentGroupService } from './experiment-group.service';

function generateFakeId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function testDistribution() {
    const TOTAL_USERS = 10000;
    let treatmentCount = 0;
    let controlCount = 0;

    console.log(`--- Running Hash Distribution Test (${TOTAL_USERS} iterations) ---`);

    for (let i = 0; i < TOTAL_USERS; i++) {
        const userId = generateFakeId();
        const group = ExperimentGroupService.getGroupForUser(userId);

        if (group === 'treatment') treatmentCount++;
        else controlCount++;
    }

    const controlPercent = (controlCount / TOTAL_USERS) * 100;
    const treatmentPercent = (treatmentCount / TOTAL_USERS) * 100;

    console.log(`Results:`);
    console.log(`- Treatment: ${treatmentCount} (${treatmentPercent.toFixed(2)}%)`);
    console.log(`- Control:   ${controlCount} (${controlPercent.toFixed(2)}%)`);

    const isFair = controlPercent >= 19 && controlPercent <= 21;

    if (isFair) {
        console.log("✅ PASS: Distribution is within the 19-21% range for Control.");
    } else {
        console.error("❌ FAIL: Distribution is outside the acceptable 19-21% range.");
    }
}

testDistribution();
