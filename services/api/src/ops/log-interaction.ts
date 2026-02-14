
/**
 * Operator Interaction Logger CLI v2
 * 
 * Usage: 
 * npx ts-node services/api/src/ops/log-interaction.ts user@email.com reminder "asked them to try again"
 */

import { PrismaClient } from '@prisma/client';

async function logInteraction() {
    const prisma = new PrismaClient();

    const email = process.argv[2];
    const type = process.argv[3];
    const note = process.argv[4];

    if (!email || !type) {
        console.error("Usage: npx ts-node log-interaction.ts <email> <type> [note]");
        console.error("Types: message | reminder | explanation | bug_help | other");
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        await (prisma as any).operatorInteraction.create({
            data: {
                userId: user?.id || null,
                userEmail: email.toLowerCase(),
                type,
                note: note || null,
            }
        });

        if (user) {
            console.log(`✅ Interaction logged for EXISTING user ${email}: [${type.toUpperCase()}] ${note || ""}`);
        } else {
            console.log(`⚠️ Interaction logged for PENDING user ${email} (User not in DB yet): [${type.toUpperCase()}] ${note || ""}`);
        }

    } catch (e: any) {
        console.error("❌ Failed to log interaction:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

logInteraction();
