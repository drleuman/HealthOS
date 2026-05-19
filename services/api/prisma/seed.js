const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding HealthOS database...');

    // 1. Seed Experiments
    console.log('Seeding experiments...');
    const experiments = [
        {
            key: 'trial_length',
            name: 'Trial Duration Optimization',
            variants: { control: 34, v3: 33, v5: 33 },
            status: 'active'
        },
        {
            key: 'paywall_trigger',
            name: 'Paywall Log Threshold',
            variants: { control: 34, v5: 33, v7: 33 },
            status: 'active'
        }
    ];

    for (const exp of experiments) {
        await prisma.experiment.upsert({
            where: { key: exp.key },
            update: exp,
            create: exp
        });
        console.log(`- Experiment ${exp.key} initialized`);
    }

    // 2. Clear existing test users if they exist to keep seed deterministic
    const testEmails = [
        'admin@healthos.com',
        'member@healthos.com',
        'trial-active@healthos.com',
        'trial-expired@healthos.com',
        'onboarding-incomplete@healthos.com',
        'onboarding-day1@healthos.com',
        'later-stage@healthos.com',
        'doctorleuman@gmail.com'
    ];

    console.log('Cleaning up existing seed test users...');
    await prisma.user.deleteMany({
        where: {
            email: { in: testEmails }
        }
    });

    const now = new Date();

    // 3. Admin User
    console.log('Creating Admin User...');
    const admin = await prisma.user.create({
        data: {
            email: 'admin@healthos.com',
            plan: 'admin',
            role: 'admin',
            status: 'active'
        }
    });

    const doctorLeuman = await prisma.user.create({
        data: {
            email: 'doctorleuman@gmail.com',
            plan: 'admin',
            role: 'admin',
            status: 'active'
        }
    });

    // 4. Normal Member User
    console.log('Creating Normal Member User...');
    await prisma.user.create({
        data: {
            email: 'member@healthos.com',
            plan: 'member',
            role: 'user',
            status: 'active'
        }
    });

    // 5. Active Trial User
    console.log('Creating Active Trial User...');
    const activeTrialUntil = new Date();
    activeTrialUntil.setDate(activeTrialUntil.getDate() + 7);
    await prisma.user.create({
        data: {
            email: 'trial-active@healthos.com',
            plan: 'free',
            role: 'user',
            status: 'active',
            trialStartedAt: now,
            trialUntil: activeTrialUntil
        }
    });

    // 6. Expired Trial User
    console.log('Creating Expired Trial User...');
    const expiredTrialUntil = new Date();
    expiredTrialUntil.setDate(expiredTrialUntil.getDate() - 2);
    const expiredTrialStarted = new Date();
    expiredTrialStarted.setDate(expiredTrialStarted.getDate() - 9);
    await prisma.user.create({
        data: {
            email: 'trial-expired@healthos.com',
            plan: 'free',
            role: 'user',
            status: 'active',
            trialStartedAt: expiredTrialStarted,
            trialUntil: expiredTrialUntil,
            totalLogs: 10
        }
    });

    // 7. User with incomplete onboarding (assessment-only or no assessment)
    console.log('Creating Incomplete Onboarding User...');
    await prisma.user.create({
        data: {
            email: 'onboarding-incomplete@healthos.com',
            plan: 'member',
            role: 'user',
            status: 'active'
        }
    });

    // 8. User with Completed Onboarding (Day 1 State)
    console.log('Creating Day 1 State User...');
    const day1User = await prisma.user.create({
        data: {
            email: 'onboarding-day1@healthos.com',
            plan: 'member',
            role: 'user',
            status: 'active'
        }
    });

    await prisma.assessments.create({
        data: {
            userId: day1User.id,
            primaryGoal: 'sleep_quality',
            sleepIssueType: ['difficulty_falling'],
            lowEnergyWindow: '15:00-17:00',
            bedtime: new Date('1970-01-01T23:00:00.000Z'),
            caffeineTime: new Date('1970-01-01T08:30:00.000Z'),
            dinnerTime: new Date('1970-01-01T20:00:00.000Z'),
            symptoms: ['morning_fatigue'],
            constraints: []
        }
    });

    await prisma.userState.create({
        data: {
            userId: day1User.id,
            profileType: 'night_owl',
            programId: 'circadian_reset_14',
            currentDay: 1,
            streak: 0,
            lastActive: now
        }
    });

    await prisma.userBehaviorState.create({
        data: {
            userId: day1User.id,
            programId: 'circadian_reset_14',
            dayIndex: 1,
            status: 'ACTIVE',
            state: 'oriented',
            currentPhase: 'detection',
            context: {}
        }
    });

    // 9. User with Later-stage State (Day 10 of a 14-day protocol)
    console.log('Creating Later Stage User (Day 10)...');
    const day10User = await prisma.user.create({
        data: {
            email: 'later-stage@healthos.com',
            plan: 'member',
            role: 'user',
            status: 'active'
        }
    });

    await prisma.assessments.create({
        data: {
            userId: day10User.id,
            primaryGoal: 'energy_levels',
            sleepIssueType: ['waking_mid_night'],
            lowEnergyWindow: '14:00-16:00',
            bedtime: new Date('1970-01-01T22:30:00.000Z'),
            caffeineTime: new Date('1970-01-01T09:00:00.000Z'),
            dinnerTime: new Date('1970-01-01T19:30:00.000Z'),
            symptoms: ['afternoon_slump'],
            constraints: []
        }
    });

    await prisma.userState.create({
        data: {
            userId: day10User.id,
            profileType: 'intermediate',
            programId: 'circadian_reset_14',
            currentDay: 10,
            streak: 5,
            lastActive: now
        }
    });

    await prisma.userBehaviorState.create({
        data: {
            userId: day10User.id,
            programId: 'circadian_reset_14',
            dayIndex: 10,
            status: 'ACTIVE',
            state: 'oriented',
            currentPhase: 'adaptation',
            context: {
                consecutiveSuccess: 5,
                adherence7d: 85
            }
        }
    });

    // Create logs for days 1 to 9
    console.log('Creating DailyLog history for Later Stage User...');
    const logsData = [];
    for (let day = 1; day <= 9; day++) {
        // Assume they succeeded on most days to build a streak/history
        const actionCompleted = day !== 4 && day !== 7; // Completed days except 4 and 7
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - (10 - day)); // staggered in the past
        
        logsData.push({
            userId: day10User.id,
            day: day,
            actionCompleted: actionCompleted,
            selfReportEffect: actionCompleted ? { energy: 'better' } : { energy: 'same' },
            createdAt: createdDate
        });
    }

    await prisma.dailyLog.createMany({
        data: logsData
    });

    console.log('Database seeding complete successfully!');
}

main()
    .catch((e) => {
        console.error('Error during database seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
