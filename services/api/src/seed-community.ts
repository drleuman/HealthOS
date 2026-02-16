import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SEEDING COMMUNITY THREADS ---');

    const threads = [
        {
            title: 'Day 1 · Circadian Reset',
            excerpt: 'How did your morning light exposure go? Share your first observations here.',
            scope: 'program_day',
            protocolId: 'circadian_reset_14',
            day: 1
        },
        {
            title: 'Caffeine Timing Strategies',
            excerpt: 'Discussing the 90-minute delay and its impact on the afternoon slump.',
            scope: 'area',
            areaId: 'circadian_signals',
            protocolId: 'circadian_reset_14',
            day: 2
        },
        {
            title: 'General Support & Welcome',
            excerpt: 'Introductions and general questions about the HealthOS measurement approach.',
            scope: 'general'
        },
        {
            title: 'Día 1 · Reparación Digestiva',
            excerpt: 'Preguntas y experiencias del día.',
            scope: 'program_day',
            protocolId: 'digestive_reset_14',
            day: 1
        },
        {
            title: 'Día 1 · Regulación Nerviosa',
            excerpt: 'Compartir observaciones sobre la respiración y el estado.',
            scope: 'program_day',
            protocolId: 'nervous_system_reset_10',
            day: 1
        }
    ];

    for (const t of threads) {
        const existing = await prisma.communityThread.findFirst({
            where: { title: t.title }
        });

        if (!existing) {
            await prisma.communityThread.create({ data: t });
            console.log(`+ Created thread: ${t.title}`);
        } else {
            console.log(`= Already exists: ${t.title}`);
        }
    }

    console.log('--- SEEDING COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
