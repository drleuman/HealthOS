
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const quizStarts = await (prisma as any).event.count({
        where: {
            event: 'quiz_start',
            createdAt: { gte: oneHourAgo },
        },
    });

    const onboardingResults = await (prisma as any).event.count({
        where: {
            event: { in: ['onboarding_completed_anonymous', 'onboarding_completed'] },
            createdAt: { gte: oneHourAgo },
        },
    });

    const signups = await (prisma as any).user.count({
        where: {
            createdAt: { gte: oneHourAgo },
        },
    });

    console.log('--- FUNNEL STATS (LAST HOUR) ---');
    console.log(`Quiz Starts: ${quizStarts}`);
    console.log(`Results Viewed: ${onboardingResults}`);
    console.log(`Signup Success: ${signups}`);

    if (quizStarts > 0) {
        console.log(`Quiz Completion Rate: ${((onboardingResults / quizStarts) * 100).toFixed(1)}%`);
    }
    if (onboardingResults > 0) {
        console.log(`Result -> Signup Rate: ${((signups / onboardingResults) * 100).toFixed(1)}%`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
