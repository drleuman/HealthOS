
/**
 * Daily Beta Digest CLI v7 (Two-Layer Operational Edition)
 * 
 * Usage: 
 * ANALYTICS_SECRET=xxx API_URL=http://localhost:4000 npx ts-node src/analytics/daily-digest.ts [YYYY-MM-DD]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { SERService, SERCohort } from './ser.service';

async function generateDigest() {
    const prisma = new PrismaClient();
    const prismaAny = prisma as any;
    const serService = new SERService(prisma as any);

    const dateArg = process.argv[2];
    const opsTZ = 'Europe/Madrid';

    // Target Date Setup in Ops TZ
    const now = dateArg ? new Date(dateArg) : new Date();
    const targetDate = new Date(now.toLocaleString('en-US', { timeZone: opsTZ }));
    targetDate.setDate(targetDate.getDate() - 1); // Yesterday
    targetDate.setHours(0, 0, 0, 0);

    const startOfTarget = new Date(targetDate);
    const endOfTarget = new Date(targetDate);
    endOfTarget.setHours(23, 59, 59, 999);

    const startOfYesterday = new Date(startOfTarget.getTime() - 24 * 60 * 60 * 1000);
    const aWeekAgo = new Date(endOfTarget.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dateStr = startOfTarget.toLocaleDateString('en-GB', { timeZone: opsTZ }).split('/').reverse().join('-');
    const reportDir = path.join(__dirname, `../../reports`);
    const digestPath = path.join(reportDir, `daily_digest_${dateStr}.md`);

    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    try {
        // --- 1. Delta Context (Load Yesterday's Stats) ---
        let deltaInfo = "No baseline (first run)";
        const prevTarget = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
        const prevDateStr = prevTarget.toLocaleDateString('en-GB', { timeZone: opsTZ }).split('/').reverse().join('-');
        const prevPath = path.join(reportDir, `daily_digest_${prevDateStr}.md`);

        let prevStats: any = null;
        if (fs.existsSync(prevPath)) {
            const content = fs.readFileSync(prevPath, 'utf8');
            const activeMatch = content.match(/- \*\*Active Users \(24h\):\*\* (\d+)/);
            const effectiveMatch = content.match(/- \*\*Effective N:\*\* (\d+)/);
            const biasMatch = content.match(/- \*\*Ops Bias Ratio:\*\* ([\d.]+)%/);
            if (activeMatch && effectiveMatch) {
                prevStats = {
                    active: parseInt(activeMatch[1], 10),
                    effective: parseInt(effectiveMatch[1], 10),
                    bias: biasMatch ? parseFloat(biasMatch[1]) : 0
                };
            }
        }

        // --- 2. Basic Stats (True 7d Active) ---
        const activeUserIds7d = (await prisma.event.groupBy({
            by: ['userId'],
            where: { timestamp: { gte: aWeekAgo, lte: endOfTarget }, userId: { not: null } }
        })).map((u: any) => u.userId!);

        const activeUserIds24h = (await prisma.event.groupBy({
            by: ['userId'],
            where: { timestamp: { gte: startOfTarget, lte: endOfTarget }, userId: { not: null } }
        })).map((u: any) => u.userId!);

        const contacted48h = (await prismaAny.operatorInteraction.findMany({
            where: { createdAt: { gte: startOfYesterday, lte: endOfTarget } },
            select: { userId: true }
        }));
        const uniqueContacted48hIds = new Set(contacted48h.filter((c: any) => c.userId).map((c: any) => c.userId));
        const contactedActiveCount = activeUserIds24h.filter((id: string) => uniqueContacted48hIds.has(id)).length;

        const hasTraffic = activeUserIds24h.length > 0;
        const biasRatio = hasTraffic ? contactedActiveCount / activeUserIds24h.length : 0;
        const biasDisplay = hasTraffic ? `${(biasRatio * 100).toFixed(1)}%` : "N/A";

        // --- 3. SER Data & Guardrails ---
        const serData = await serService.computeSERDistribution(startOfYesterday, endOfTarget);
        const candidatesN = serData.candidatesN || 1;
        const contaminationLevel = serData.integrity?.contaminationCount || 0;

        // Delta Calculation
        if (prevStats && hasTraffic) {
            const activeDelta = activeUserIds24h.length - prevStats.active;
            const effectiveDelta = serData.effectiveN - prevStats.effective;
            deltaInfo = `Traffic ${activeDelta >= 0 ? '+' : ''}${activeDelta}, EffectN ${effectiveDelta >= 0 ? '+' : ''}${effectiveDelta}`;
        }

        // --- 4. Verdict Logic (Hardenized v9) ---
        let trustLevel = "UNUSABLE";
        let primaryCause = "SAMPLE_SIZE";
        let action = "WAIT";
        let condition = "N ≥ 8 valid returns";
        const usableGate = "Tr:Untouched N≥15 AND Ctrl:Untouched N≥15 AND Bias < 30%";

        if (!hasTraffic) {
            trustLevel = "UNUSABLE";
            primaryCause = "NO_TRAFFIC";
            action = "WAIT";
            condition = "Zero Active Traffic";
        } else if (contaminationLevel > 0) {
            trustLevel = "UNUSABLE";
            primaryCause = "CONTAMINATION";
            action = "INVESTIGATE";
            condition = `Control group exposed (${contaminationLevel} events)`;
        } else {
            const trUntouchedN = serData.cohorts.treatment_untouched.effectiveN;
            const ctrlUntouchedN = serData.cohorts.control_untouched.effectiveN;

            if (trUntouchedN >= 15 && ctrlUntouchedN >= 15 && biasRatio < 0.3) {
                trustLevel = "USABLE";
            } else if (serData.effectiveN >= 8 && biasRatio < 0.45) {
                trustLevel = "LIMITED";
            }

            if (serData.effectiveN < 8) primaryCause = "SAMPLE_SIZE";
            else if (biasRatio >= 0.3) primaryCause = "HUMAN";
            else if (serData.discards.previous_session_intervention / candidatesN >= 0.4) primaryCause = "INTERVENTION";
            else if (serData.discards.first_day_window / candidatesN >= 0.4) primaryCause = "EARLY_PHASE";
            else primaryCause = "NONE";

            if (primaryCause === "HUMAN") {
                action = "CEASE OPERATOR CONTACT";
                condition = "Bias Ratio > 30%";
            } else if (primaryCause === "INTERVENTION") {
                action = "FREEZE INTERVENTIONS";
                condition = "Stimulus Over-ride (40%)";
            } else if (trustLevel === "USABLE") {
                action = "INTERPRET SER";
                condition = "Signal Stable";
            }
        }

        // --- 4. LAYER 1 (Operator Layer) Calculation ---
        // const validSampleN = serData.cohorts.treatment_untouched.effectiveN; // This is now part of the digest directly
        const signalStatus = trustLevel === "UNUSABLE" ? "COLLECTING" : "STABLE";

        // --- 5. Action Selection ---
        // Action and condition are now determined within the verdict logic
        const nextCheckDate = new Date(startOfTarget.getTime() + 24 * 60 * 60 * 1000);
        const nextCheckStr = (primaryCause === "CONTAMINATION") ? "IMMEDIATE" : `${nextCheckDate.toLocaleDateString('en-GB', { timeZone: opsTZ }).split('/').reverse().join('-')} 09:00 AM ${opsTZ}`;

        // --- 6. LAYER 2 Helpers (Technical Annex) ---
        const getActionableState = (cohort: SERCohort, trust: string, isOpsCohort = false, name = "") => {
            if (isOpsCohort && name.includes('Contacted') && cohort.effectiveN > 0) return "DISCARD";
            if (trust === "UNUSABLE") return "IGNORE";
            if (trust === "LIMITED") return cohort.effectiveN >= 3 ? "WATCH" : "IGNORE";
            if (trust === "USABLE") return cohort.effectiveN >= 15 ? "USE" : (cohort.effectiveN >= 3 ? "WATCH" : "IGNORE");
            return "IGNORE";
        };

        const formatCohort = (name: string, cohort: SERCohort, trust: string, isOpsCohort = false) => {
            const state = getActionableState(cohort, trust, isOpsCohort, name);
            return `| **${name}** | [${state}] | ${cohort.effectiveN} | ${cohort.distribution['0-6h']} | **${cohort.distribution['6-24h']}** ⭐ | ${cohort.distribution['24-72h']} | ${cohort.discards.previous_session_intervention} / ${cohort.discards.operator_window} |`;
        };

        const digestMd = `
# 📅 Resumen Diario Beta: ${dateStr} (${opsTZ})

## ⚖️ VEREDICTO OPERATIVO (Escaneo 5s)
- **NIVEL DE CONFIANZA:** ${trustLevel === 'USABLE' ? '✅ CONFIABLE (USABLE)' : (trustLevel === 'LIMITED' ? '🟡 LIMITADO' : '❌ NO USABLE')}
- **EVOLUCIÓN (DELTA):** ${deltaInfo}
- **CAUSA PRIMARIA:** ${primaryCause}
- **REQUISITO DE CONFIANZA (GATE):** ${usableGate}
- **ESTADO DE LOS DATOS:** ${signalStatus === 'STABLE' ? 'ESTABLE' : 'RECOLECTANDO'}
- **MUESTRA VÁLIDA:** ${serData.cohorts.treatment_untouched.effectiveN} usuarios (Tr ∩ Intocables)

---

## ⚡ INSTRUCCIÓN PROCEDIMENTAL
- **ACCIÓN:** ${action}
- **CONDICIÓN:** ${condition}
- **SIGUIENTE REVISIÓN:** ${nextCheckStr}
- **⚠️ NO VOLVER A REVISAR ANTES DE LA PRÓXIMA HORA DETERMINADA**

---

## 🔬 ANEXO TÉCNICO (Auditoría Completa)

### Retorno Espontáneo de Enganche (SER)

| Cohorte | Estado | N | 0-6h | 6-24h | 24-72h | Descartes (Intv/Ops) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${formatCohort('Tr: Intocable', serData.cohorts.treatment_untouched, trustLevel)}
${formatCohort('Tr: Contactado', serData.cohorts.treatment_contacted, trustLevel, true)}
${formatCohort('Ctrl: Intocable', serData.cohorts.control_untouched, trustLevel)}
${formatCohort('Ctrl: Contactado', serData.cohorts.control_contacted, trustLevel, true)}

### Banderas de Integridad
- **Usuarios Activos (7d):** ${activeUserIds7d.length}
- **Usuarios Activos (24h):** ${activeUserIds24h.length}
- **Sesgo de Operaciones:** ${biasDisplay} ${biasRatio > 0.3 ? '⚠️' : ''}
- **Cobertura (Filtros):** ${Math.round((serData.effectiveN / candidatesN) * 100)}%
- **Cobertura (Usuarios):** ${Math.round((serData.effectiveN / (activeUserIds24h.length || 1)) * 100)}%
- **N Efectiva:** ${serData.effectiveN}
- **N Candidatos:** ${candidatesN}
- **Chequeo de Contaminación:** ${contaminationLevel > 0 ? `❌ FALLIDO (${contaminationLevel})` : '✅ PASADO'}

---
*Generado por el Motor de Operaciones Beta de HealthOS (v9.1).*
`;

        fs.writeFileSync(digestPath, digestMd);
        console.log(`✅ Daily digest created: ${digestPath}`);

    } catch (e: any) {
        console.error("❌ Failed to generate digest:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

generateDigest();
