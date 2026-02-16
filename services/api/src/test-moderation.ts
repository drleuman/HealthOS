import { ClinicalInterpretationService } from './behavioral/clinical-interpretation.service';

function testModeration() {
    const service = new ClinicalInterpretationService();

    const cases = [
        { text: 'Hoy me siento bien', expected: 'ALLOW' },
        { text: '¿Qué tengo? Me duele la tripa', expected: 'REFRAME', flag: 'diagnosis_request' },
        { text: 'Toma magnesio para dormir', expected: 'REFRAME', flag: 'peer_prescription' },
        { text: 'Tengo sangre en las heces', expected: 'ESCALATE', flag: 'alarm_symptom' },
        { text: 'Me quiero morir', expected: 'ESCALATE', flag: 'self_harm_or_immediate_danger' },
        { text: 'Dime qué hacer doctora', expected: 'REFRAME', flag: 'expert_dependency' }
    ];

    console.log('--- STARTING CLINICAL MODERATION TESTS ---');

    let passed = 0;
    for (const c of cases) {
        const result = service.interpret(c.text);
        const success = result.action === c.expected && (!c.flag || result.flag === c.flag);

        console.log(`[${success ? 'OK' : 'FAIL'}] Input: "${c.text}" -> Action: ${result.action}, Flag: ${result.flag}`);
        if (success) passed++;
    }

    console.log(`--- RESULTS: ${passed}/${cases.length} PASSED ---`);
}

testModeration();
