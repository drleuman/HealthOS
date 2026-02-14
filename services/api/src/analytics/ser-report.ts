/**
 * SER Report CLI v3 (Hardened + Discard Transparency)
 * 
 * Usage: 
 * ANALYTICS_SECRET=xxx API_URL=http://localhost:4000 npx ts-node src/analytics/ser-report.ts
 */

import { PrismaClient } from '@prisma/client';
import { SERService } from './ser.service';

async function generateSERReport() {
    const prisma = new PrismaClient();
    const serService = new SERService(prisma as any);

    const now = new Date();
    const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log(`\n--- Spontaneous Engagement Return (SER) Report ---`);
    console.log(`Window: ${aWeekAgo.toISOString()} to ${now.toISOString()}`);
    console.log(`--------------------------------------------------`);

    try {
        const result = await serService.computeSERDistribution(aWeekAgo, now);

        console.log(`Status: ${result.status === 'INSUFFICIENT_EVIDENCE' ? '⚠️ ' : '✅ '}${result.status}`);
        console.log(`Effective N (Analyzed returns): ${result.effectiveN}`);
        console.log(`Spontaneous Returns Detected: ${result.spontaneousReturns}`);

        console.log(`\nDiscard Breakdown:`);
        console.table(result.discards);

        if (result.spontaneousReturns > 0) {
            console.log(`\nDistribution Buckets:`);
            console.table(result.distribution);
        } else {
            console.log(`\nNo spontaneous returns detected in this window.`);
        }

        console.log(`\nAnalysis Logs (Recent):`);
        result.logs.forEach(log => console.log(`- ${log}`));

        console.log(`\n--- Interpretation Guide ---`);
        console.log(`- 6-24h (⭐ BEST): Contextual Integration. App is remembered daily without push.`);
        console.log(`- 0-6h: Curiosity/Recency usage.`);
        console.log(`- 24-72h: Deliberate utility.`);
        console.log(`- >72h: Recovery/Rediscovery.`);

    } catch (e: any) {
        console.error("❌ Failed to generate SER report:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

generateSERReport();
