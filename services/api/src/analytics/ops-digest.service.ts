import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SERService, SERCohort } from './ser.service';
import * as fs from 'fs';
import * as path from 'path';

export interface DigestResult {
    dateStr: string;
    trustLevel: string;
    primaryCause: string;
    action: string;
    condition: string;
    nextCheck: string;
    validSampleN: number;
    effectiveN: number;
    candidatesN: number;
    biasRatio: number;
    coverageFilters: number;
    coverageUsers: number;
    contaminationCount: number;
    activeUsers24h: number;
    activeUsers7d: number;
    deltaInfo: string;
    layer1Message: string;
    markdown: string;
    outputPath: string;
}

import { NotificationHubService } from '../notifications/notification-hub.service';

@Injectable()
export class OpsDigestService {
    constructor(
        private prisma: PrismaService,
        private serService: SERService,
        private notificationHub: NotificationHubService
    ) { }

    async runDailyDigest(options?: { date?: Date; tz?: string }): Promise<DigestResult> {
        const prismaAny = this.prisma as any;
        const opsTZ = options?.tz || 'Europe/Madrid';
        const targetDate = options?.date || new Date();

        // ... [Existing code to fetch data] ... (This is implicit, I just need to match context)
        // I cannot match context easily with huge gap. 
        // I will use specific targets.

        // ...

        // Target Date Setup in Ops TZ
        const now = new Date(targetDate.toLocaleString('en-US', { timeZone: opsTZ }));
        now.setDate(now.getDate() - 1); // Yesterday
        now.setHours(0, 0, 0, 0);

        const startOfTarget = new Date(now);
        const endOfTarget = new Date(now);
        endOfTarget.setHours(23, 59, 59, 999);

        const startOfYesterday = new Date(startOfTarget.getTime() - 24 * 60 * 60 * 1000);
        const aWeekAgo = new Date(endOfTarget.getTime() - 7 * 24 * 60 * 60 * 1000);

        const dateStr = startOfTarget.toLocaleDateString('en-GB', { timeZone: opsTZ }).split('/').reverse().join('-');
        const reportDir = path.join(__dirname, `../../reports`);
        const digestPath = path.join(reportDir, `daily_digest_${dateStr}.md`);

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // --- 1. Delta Context (Load Yesterday's Stats) ---
        let deltaInfo = "No baseline (first run)";
        const prevTarget = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
        const prevDateStr = prevTarget.toLocaleDateString('en-GB', { timeZone: opsTZ }).split('/').reverse().join('-');
        const prevPath = path.join(reportDir, `daily_digest_${prevDateStr}.md`);

        let prevStats: any = null;
        if (fs.existsSync(prevPath)) {
            const content = fs.readFileSync(prevPath, 'utf8');
            const activeMatch = content.match(/- \*\*Usuarios Activos \(24h\):\*\* (\d+)/);
            const effectiveMatch = content.match(/- \*\*N Efectiva:\*\* (\d+)/);
            const biasMatch = content.match(/- \*\*Sesgo de Operaciones:\*\* ([\d.]+)%/);
            if (activeMatch && effectiveMatch) {
                prevStats = {
                    active: parseInt(activeMatch[1], 10),
                    effective: parseInt(effectiveMatch[1], 10),
                    bias: biasMatch ? parseFloat(biasMatch[1]) : 0
                };
            }
        }

        // --- 2. Basic Stats (True 7d Active) ---
        const activeUserIds7d = (await this.prisma.event.groupBy({
            by: ['userId'],
            where: { timestamp: { gte: aWeekAgo, lte: endOfTarget }, userId: { not: null } }
        })).map(u => u.userId!);

        const activeUserIds24h = (await this.prisma.event.groupBy({
            by: ['userId'],
            where: { timestamp: { gte: startOfTarget, lte: endOfTarget }, userId: { not: null } }
        })).map(u => u.userId!);

        const contacted48h = (await prismaAny.operatorInteraction.findMany({
            where: { createdAt: { gte: startOfYesterday, lte: endOfTarget } },
            select: { userId: true }
        }));
        const uniqueContacted48hIds = new Set(contacted48h.filter((c: any) => c.userId).map((c: any) => c.userId));
        const contactedActiveCount = activeUserIds24h.filter(id => uniqueContacted48hIds.has(id)).length;

        const hasTraffic = activeUserIds24h.length > 0;
        const biasRatio = hasTraffic ? contactedActiveCount / activeUserIds24h.length : 0;
        const biasDisplay = hasTraffic ? `${(biasRatio * 100).toFixed(1)}%` : "N/A";

        // --- 3. SER Data & Guardrails ---
        const serData = await this.serService.computeSERDistribution(startOfYesterday, endOfTarget);
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

        const signalStatus = trustLevel === "UNUSABLE" ? "RECOLECTANDO" : "ESTABLE";
        const nextCheckDate = new Date(startOfTarget.getTime() + 24 * 60 * 60 * 1000);
        const nextCheckStr = (primaryCause === "CONTAMINATION") ? "IMMEDIATE" : `${nextCheckDate.toLocaleDateString('en-GB', { timeZone: opsTZ }).split('/').reverse().join('-')} 09:00 AM ${opsTZ}`;

        // --- 5. LAYER 2 Helpers (Technical Annex) ---
        const getActionableState = (cohort: SERCohort, trust: string, isOpsCohort = false, name = "") => {
            if (isOpsCohort && name.includes('Contactado') && cohort.effectiveN > 0) return "DISCARD";
            if (trust === "UNUSABLE") return "IGNORE";
            if (trust === "LIMITED") return cohort.effectiveN >= 3 ? "WATCH" : "IGNORE";
            if (trust === "USABLE") return cohort.effectiveN >= 15 ? "USE" : (cohort.effectiveN >= 3 ? "WATCH" : "IGNORE");
            return "IGNORE";
        };

        const formatCohort = (name: string, cohort: SERCohort, trust: string, isOpsCohort = false) => {
            const state = getActionableState(cohort, trust, isOpsCohort, name);
            // Format discards: PreviousSession / OperatorWindow / NotificationWindow
            return `| **${name}** | [${state}] | ${cohort.effectiveN} | ${cohort.distribution['0-6h']} | **${cohort.distribution['6-24h']}** ⭐ | ${cohort.distribution['24-72h']} | ${cohort.discards.previous_session_intervention} / ${cohort.discards.operator_window} / ${cohort.discards.notification_window || 0} |`;
        };

        const coverageFilters = Math.round((serData.effectiveN / candidatesN) * 100);
        const coverageUsers = Math.round((serData.effectiveN / (activeUserIds24h.length || 1)) * 100);

        // --- 6. Layer 1 Message (Short) ---
        const trustEmoji = trustLevel === 'USABLE' ? '✅' : (trustLevel === 'LIMITED' ? '🟡' : '❌');
        const layer1Message = `${trustEmoji} TRUST: ${trustLevel} | CAUSE: ${primaryCause} | ACTION: ${action} | NEXT: ${nextCheckStr.split(' ')[0]} | SAMPLE: ${serData.cohorts.treatment_untouched.effectiveN} | N: ${serData.effectiveN}/${candidatesN} | Bias: ${biasDisplay} | Contam: ${contaminationLevel}`;

        // Compute Notification Uplift
        const uplift = await this.notificationHub.computeNotificationUplift();

        // --- 7. Full Markdown ---
        const digestMd = `
# 📅 Resumen Diario Beta: ${dateStr} (${opsTZ})

## ⚖️ VEREDICTO OPERATIVO (Escaneo 5s)
- **NIVEL DE CONFIANZA:** ${trustLevel === 'USABLE' ? '✅ CONFIABLE (USABLE)' : (trustLevel === 'LIMITED' ? '🟡 LIMITADO' : '❌ NO USABLE')}
- **EVOLUCIÓN (DELTA):** ${deltaInfo}
- **CAUSA PRIMARIA:** ${primaryCause}
- **REQUISITO DE CONFIANZA (GATE):** ${usableGate}
- **ESTADO DE LOS DATOS:** ${signalStatus}
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

| Cohorte | Estado | N | 0-6h | 6-24h | 24-72h | Descartes (Intv / Ops / Notif) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${formatCohort('Tr: Intocable', serData.cohorts.treatment_untouched, trustLevel)}
${formatCohort('Tr: Contactado', serData.cohorts.treatment_contacted, trustLevel, true)}
${formatCohort('Ctrl: Intocable', serData.cohorts.control_untouched, trustLevel)}
${formatCohort('Ctrl: Contactado', serData.cohorts.control_contacted, trustLevel, true)}

### Banderas de Integridad
- **Usuarios Activos (7d):** ${activeUserIds7d.length}
- **Usuarios Activos (24h):** ${activeUserIds24h.length}
- **Sesgo de Operaciones:** ${biasDisplay} ${biasRatio > 0.3 ? '⚠️' : ''}
- **Cobertura (Filtros):** ${coverageFilters}%
- **Cobertura (Usuarios):** ${coverageUsers}%
- **N Efectiva:** ${serData.effectiveN}
- **N Candidatos:** ${candidatesN}
- **Chequeo de Contaminación:** ${contaminationLevel > 0 ? `❌ FALLIDO (${contaminationLevel})` : '✅ PASADO'}

### 📡 Notification Hub (Trial)
- **Window:** ${uplift.window}
- **Candidates (Eligible):** ${uplift.candidatesN}
- **Sent (Treatment):** ${uplift.sentN}
- **Return Rate (Sent):** ${(uplift.return24h_sent_rate * 100).toFixed(1)}%
- **Return Rate (Baseline):** ${(uplift.return24h_candidate_rate * 100).toFixed(1)}%
- **Net Uplift:** ${(uplift.uplift * 100).toFixed(1)} pp

---
* Generado por el Motor de Operaciones Beta de HealthOS(v9.1).*
`;

        fs.writeFileSync(digestPath, digestMd);

        return {
            dateStr,
            trustLevel,
            primaryCause,
            action,
            condition,
            nextCheck: nextCheckStr,
            validSampleN: serData.cohorts.treatment_untouched.effectiveN,
            effectiveN: serData.effectiveN,
            candidatesN,
            biasRatio,
            coverageFilters,
            coverageUsers,
            contaminationCount: contaminationLevel,
            activeUsers24h: activeUserIds24h.length,
            activeUsers7d: activeUserIds7d.length,
            deltaInfo,
            layer1Message,
            markdown: digestMd,
            outputPath: digestPath
        };
    }
}
