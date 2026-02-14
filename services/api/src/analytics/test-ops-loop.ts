
/**
 * Beta Ops Verification Script
 * 
 * Verifies:
 * 1. Allowlist blocks non-beta users (plan=free)
 * 2. Allowlisted users get plan=member
 * 3. Daily digest generation
 * 
 * To run: npx ts-node services/api/src/analytics/test-ops-loop.ts
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

async function verifyBetaOps() {
    const prisma = new PrismaClient();
    const TEST_PREFIX = `beta-ops-${Date.now()}`;
    const BETA_EMAIL = `${TEST_PREFIX}-allowed@example.com`.toLowerCase();
    const PUBLIC_EMAIL = `${TEST_PREFIX}-public@example.com`.toLowerCase();

    console.log("--- STARTING BETA OPS VERIFICATION ---");

    try {
        // 1. Setup Allowlist Env
        process.env.BETA_ALLOWLIST = BETA_EMAIL;
        const API_URL = process.env.API_URL || 'http://localhost:4000';

        console.log(`1. Testing Beta Access Control (Allowlist) at ${API_URL}...`);

        // Login Allowed User
        const resAllowed = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: BETA_EMAIL })
        });
        const dataAllowed = await resAllowed.json();

        if (dataAllowed.user?.plan === 'member') {
            console.log(`✅ PASS: Allowed user ${BETA_EMAIL} received 'member' plan.`);
        } else {
            console.error(`❌ FAIL: Allowed user received '${dataAllowed.user?.plan}' plan.`);
        }

        // Login Public User
        const resPublic = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: PUBLIC_EMAIL })
        });
        const dataPublic = await resPublic.json();

        if (dataPublic.user?.plan === 'free') {
            console.log(`✅ PASS: Public user ${PUBLIC_EMAIL} received 'free' plan.`);
        } else {
            console.error(`❌ FAIL: Public user received '${dataPublic.user?.plan}' plan.`);
        }

        // 2. Test Daily Digest
        console.log("2. Testing Daily Digest generation...");
        const digestScript = path.join(__dirname, './daily-digest.ts');
        const dateStr = new Date().toISOString().split('T')[0];

        execSync(`npx ts-node ${digestScript} ${dateStr}`, {
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'test' }
        });

        const digestFile = path.join(__dirname, `../../reports/daily_digest_${dateStr}.md`);
        if (fs.existsSync(digestFile)) {
            console.log(`✅ PASS: Daily digest created at ${digestFile}`);
            const content = fs.readFileSync(digestFile, 'utf8');
            if (content.includes('Treatment Active') && content.includes('Contamination Check')) {
                console.log("✅ PASS: Digest contains causal monitoring fields.");
            }
        } else {
            console.error("❌ FAIL: Daily digest file not found.");
        }

        // 3. Cleanup
        console.log("3. Cleaning up test users...");
        const users = await prisma.user.findMany({ where: { email: { startsWith: TEST_PREFIX } } });
        for (const u of users) {
            await prisma.user.delete({ where: { id: u.id } });
        }

    } catch (e: any) {
        console.error("❌ VERIFICATION ERROR:", e.message);
        console.log("Note: Ensure the API server is running at", process.env.API_URL || 'http://localhost:4000');
    } finally {
        await prisma.$disconnect();
        console.log("--- BETA OPS VERIFICATION COMPLETE ---");
    }
}

verifyBetaOps();
