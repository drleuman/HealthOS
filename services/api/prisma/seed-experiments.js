const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding experiments...');

    const experiments = [
        {
            key: 'trial_length',
            name: 'Trial Duration Optimization',
            variants: {
                control: 34,
                v3: 33,
                v5: 33
            },
            status: 'active'
        },
        {
            key: 'paywall_trigger',
            name: 'Paywall Log Threshold',
            variants: {
                control: 34,
                v5: 33,
                v7: 33
            },
            status: 'active'
        }
    ];

    for (const exp of experiments) {
        await prisma.experiment.upsert({
            where: { key: exp.key },
            update: exp,
            create: exp
        });
        console.log(`- ${exp.key} initialized`);
    }

    console.log('Seed complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
