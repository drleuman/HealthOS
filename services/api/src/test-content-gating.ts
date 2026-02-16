import { ProtocolContentService } from './content/protocol-content.service';

async function runGatingTests() {
    const service = new ProtocolContentService();
    const protocolId = 'circadian_reset_14';

    console.log('--- CONTENT GATING TEST MATRIX ---');

    const cases = [
        {
            name: '1. Day < 4, Friction Low (0.1) -> Product NO',
            day: 1,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 0, frictionScore: 0.1 },
            assert: (res: any) => !res.resources.some((r: any) => r.type === 'product')
        },
        {
            name: '2. Day 6, Friction Low (0.1) -> Product NO (even if day >= 6)',
            day: 6,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 5, frictionScore: 0.1 },
            assert: (res: any) => !res.resources.some((r: any) => r.type === 'product')
        },
        {
            name: '3. Day 6, Friction High (0.5) -> Product YES',
            day: 6,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 5, frictionScore: 0.5 },
            assert: (res: any) => res.resources.some((r: any) => r.type === 'product')
        },
        {
            name: '4. MinimalMode L1 -> Product NO, Blog YES',
            day: 6,
            minimal: { enabled: true, level: 1 },
            context: { completedDays: 5, frictionScore: 0.5 },
            assert: (res: any) => !res.resources.some((r: any) => r.type === 'product') && res.resources.some((r: any) => r.type === 'blog')
        },
        {
            name: '5. MinimalMode L2 -> ONLY Community',
            day: 6,
            minimal: { enabled: true, level: 2 },
            context: { completedDays: 5, frictionScore: 0.5 },
            assert: (res: any) => res.resources.every((r: any) => r.type === 'community')
        },
        {
            name: '6. Stable Order -> Community should be first',
            day: 1,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 0, frictionScore: 0.5 },
            assert: (res: any) => res.resources[0].type === 'community'
        },
        {
            name: '7. Max Products -> Limit to 1',
            day: 14, // Assuming day 14 might have multiple if I added them
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 13, frictionScore: 0.8 },
            assert: (res: any) => res.resources.filter((r: any) => r.type === 'product').length <= 1
        },
        {
            name: '8. Gating: Completed days < 3 -> Product NO',
            day: 6,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 1, frictionScore: 0.5 },
            assert: (res: any) => !res.resources.some((r: any) => r.type === 'product')
        },
        {
            name: '9. Gating: Completed days >= 3 -> Product YES',
            day: 6,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 3, frictionScore: 0.5 },
            assert: (res: any) => res.resources.some((r: any) => r.type === 'product')
        },
        {
            name: '10. Order: Community < Blog < Recipe < Course < Product',
            day: 7,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 6, frictionScore: 0.5 },
            assert: (res: any) => {
                const types = res.resources.map((r: any) => r.type);
                // day 7 has blog, course, community
                return types.indexOf('community') < types.indexOf('blog') && types.indexOf('blog') < types.indexOf('course');
            }
        },
        {
            name: '11. Day 14 -> Next step course visible',
            day: 14,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 13, frictionScore: 0.5 },
            assert: (res: any) => res.resources.some((r: any) => r.type === 'course' && r.tags.includes('next_step'))
        },
        {
            name: '12. Empty day -> Resources empty',
            day: 99,
            minimal: { enabled: false, level: 0 },
            context: { completedDays: 0 },
            assert: (res: any) => res === null
        }
    ];

    let passed = 0;
    cases.forEach(c => {
        try {
            const res = service.getTodayProtocolContent(protocolId, c.day, c.minimal as any, c.context);
            const ok = c.assert(res);
            if (ok) {
                console.log(`✅ PASSED: ${c.name}`);
                passed++;
            } else {
                console.error(`❌ FAILED: ${c.name}`);
                if (res?.resources) console.log('Resources found:', res.resources.map((r: any) => `${r.type}: ${r.slug || r.threadId}`));
            }
        } catch (e) {
            console.error(`💥 ERROR in ${c.name}:`, e);
        }
    });

    console.log(`\nResults: ${passed}/${cases.length} passed.`);
}

runGatingTests();
