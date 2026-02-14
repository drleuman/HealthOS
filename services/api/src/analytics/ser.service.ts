import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { logger } from '../logger';

export interface SERResult {
    status: string;
    effectiveN: number;
    candidatesN: number;
    spontaneousReturns: number;
    passive_orientation: number;
    discards: any;
    distribution: any;
    cohorts: {
        treatment: SERCohort;
        control: SERCohort;
        contacted: SERCohort;
        untouched: SERCohort;
        treatment_untouched: SERCohort;
        treatment_contacted: SERCohort;
        control_untouched: SERCohort;
        control_contacted: SERCohort;
    };
    logs: string[];
    integrity: {
        contaminationCount: number;
    };
}

export interface SERCohort {
    effectiveN: number;
    candidatesN: number;
    spontaneousReturns: number;
    passive_orientation: number;
    distribution: any;
    discards: any;
}

@Injectable()
export class SERService {
    constructor(private prisma: PrismaService) { }

    async computeSERDistribution(startDate: Date, endDate: Date): Promise<SERResult> {
        logger.info(`Computing SER Distribution from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const users = await this.prisma.user.findMany({
            where: { createdAt: { lte: endDate } },
            include: { state: true }
        });

        const initCohort = (): SERCohort => ({
            effectiveN: 0,
            candidatesN: 0,
            spontaneousReturns: 0,
            passive_orientation: 0,
            distribution: { '0-6h': 0, '6-24h': 0, '24-72h': 0, '>72h': 0 },
            discards: { previous_session_intervention: 0, operator_window: 0, first_day_window: 0, no_session_boundary: 0 }
        });

        const result: SERResult = {
            status: '',
            effectiveN: 0,
            candidatesN: 0,
            spontaneousReturns: 0,
            passive_orientation: 0,
            discards: { duplicate_open: 0, no_session_boundary: 0, previous_session_intervention: 0, operator_window: 0, first_day_window: 0 },
            distribution: { '0-6h': 0, '6-24h': 0, '24-72h': 0, '>72h': 0 },
            cohorts: {
                treatment: initCohort(),
                control: initCohort(),
                contacted: initCohort(),
                untouched: initCohort(),
                treatment_untouched: initCohort(),
                treatment_contacted: initCohort(),
                control_untouched: initCohort(),
                control_contacted: initCohort()
            },
            logs: [],
            integrity: {
                contaminationCount: 0
            }
        };

        for (const user of users) {
            const events = await this.prisma.event.findMany({
                where: { userId: user.id, timestamp: { lte: endDate } },
                orderBy: { timestamp: 'asc' }
            });

            if (events.length < 1) continue;

            const expGroup = (user.state as any)?.experimentGroup || 'control';

            // HARD CONTAMINATION CHECK: Control group must never have interventions
            if (expGroup === 'control') {
                const hasIntervention = events.some((e: any) => e.event === 'intervention_recommended' || e.event === 'micro_intervention_shown');
                if (hasIntervention) {
                    result.integrity.contaminationCount++;
                }
            }

            const firstEvent = events[0];
            const onboardingWindowEnd = new Date(firstEvent.timestamp.getTime() + 24 * 60 * 60 * 1000);

            // Fetch interactions for contacted cohort (last 48h relative to end of window)
            const fortyEightHoursAgo = new Date(endDate.getTime() - 48 * 60 * 60 * 1000);
            const totalInteractions = await (this.prisma as any).operatorInteraction.count({
                where: {
                    userId: user.id,
                    createdAt: { gte: fortyEightHoursAgo, lte: endDate }
                }
            });

            const isContacted = totalInteractions > 0;
            // expGroup is already defined above

            // Intersection identification
            let intersection: SERCohort;
            if (expGroup === 'treatment') {
                intersection = isContacted ? result.cohorts.treatment_contacted : result.cohorts.treatment_untouched;
            } else {
                intersection = isContacted ? result.cohorts.control_contacted : result.cohorts.control_untouched;
            }

            const userCohorts = [
                expGroup === 'treatment' ? result.cohorts.treatment : result.cohorts.control,
                isContacted ? result.cohorts.contacted : result.cohorts.untouched,
                intersection
            ];

            // Group events into sessions
            const sessions: any[][] = [];
            let currentSession: any[] = [events[0]];
            for (let i = 1; i < events.length; i++) {
                const gap = events[i].timestamp.getTime() - events[i - 1].timestamp.getTime();
                if (gap > 2 * 60 * 60 * 1000) {
                    sessions.push(currentSession);
                    currentSession = [events[i]];
                } else {
                    currentSession.push(events[i]);
                }
            }
            sessions.push(currentSession);

            if (sessions.length < 2) {
                result.discards.no_session_boundary++;
                userCohorts.forEach(c => c.discards.no_session_boundary++);
                continue;
            }

            for (let i = 0; i < sessions.length - 1; i++) {
                const prevSession = sessions[i];
                const nextSession = sessions[i + 1];
                const returnEvent = nextSession[0];
                const returnTime = returnEvent.timestamp;
                const latencyHours = (returnTime.getTime() - prevSession[prevSession.length - 1].timestamp.getTime()) / (1000 * 60 * 60);

                if (returnEvent.event !== 'app_opened') continue;

                // Track total candidates before any filtering
                result.candidatesN++;
                userCohorts.forEach(c => c.candidatesN++);

                if (returnTime <= onboardingWindowEnd) {
                    result.discards.first_day_window++;
                    userCohorts.forEach(c => c.discards.first_day_window++);
                    result.logs.push(`U:${user.id} Discarded: First day window.`);
                    continue;
                }

                result.effectiveN++;
                userCohorts.forEach(c => c.effectiveN++);

                const recentInteraction = await (this.prisma as any).operatorInteraction.count({
                    where: { userId: user.id, createdAt: { gte: new Date(returnTime.getTime() - 24 * 60 * 60 * 1000), lte: returnTime } }
                });

                if (recentInteraction > 0) {
                    result.discards.operator_window++;
                    userCohorts.forEach(c => c.discards.operator_window++);
                    result.logs.push(`U:${user.id} Discarded: Operator window.`);
                    continue;
                }

                const interventionInPrev = prevSession.some(e => e.event === 'intervention_recommended' || e.event === 'micro_intervention_shown');
                if (interventionInPrev) {
                    result.discards.previous_session_intervention++;
                    userCohorts.forEach(c => c.discards.previous_session_intervention++);
                    result.logs.push(`U:${user.id} Discarded: Prev session intervention.`);
                    continue;
                }

                // SER HARDENING: Discard if notification sent in last 12h
                const recentNotification = await (this.prisma as any).notificationEvent.count({
                    where: {
                        userId: user.id,
                        sentAt: {
                            gte: new Date(returnTime.getTime() - 12 * 60 * 60 * 1000),
                            lte: returnTime
                        },
                        status: 'sent'
                    }
                });

                if (recentNotification > 0) {
                    // SER HARDENING: Use distinct discard bucket
                    // Note: Ensure initializeCohorts/Results handles this key if strictly typed, 
                    // or rely on dynamic nature of the object if typed as record.
                    // Assuming we need to extend the type definition or just assign dynamically.
                    // The interface shows `discards: any`, so dynamic key assignment works.

                    if (!result.discards.notification_window) result.discards.notification_window = 0;
                    result.discards.notification_window++;

                    userCohorts.forEach(c => {
                        if (!c.discards.notification_window) c.discards.notification_window = 0;
                        c.discards.notification_window++;
                    });

                    result.logs.push(`U:${user.id} Discarded: Notification window.`);
                    continue;
                }

                // SER HARDENING (Metrology): Confirmation Behavior Window
                // Detects "system check" where NOTHING happened before, and NOTHING happens now.
                // Context-Aware: If previous session HAD action, this is likely "Reflective Review" (Valid), so we SKIP discard.
                const prevSessionEndsWithAction = prevSession.some(e => ['day_completed', 'action_marked_done'].includes(e.event));
                const currentSessionHasStateChange = nextSession.some(e => ['day_completed', 'action_marked_done', 'lesson_replayed'].includes(e.event));

                // User Requirement: "if previous session contained cognitive action -> never confirmation"
                // So we only discard if !prevSessionEndsWithAction
                if (!prevSessionEndsWithAction && !currentSessionHasStateChange && latencyHours < 0.33) { // < 20 min
                    if (!result.discards.confirmation_behavior_window) result.discards.confirmation_behavior_window = 0;
                    result.discards.confirmation_behavior_window++;

                    userCohorts.forEach(c => {
                        if (!c.discards.confirmation_behavior_window) c.discards.confirmation_behavior_window = 0;
                        c.discards.confirmation_behavior_window++;
                    });

                    result.logs.push(`U:${user.id} Discarded: Confirmation Behavior (Double check without context).`);
                    continue;
                }

                // SER HARDENING: UI Reassurance vs Passive Orientation vs Self-Obs
                const sessionDuration = nextSession[nextSession.length - 1].timestamp.getTime() - nextSession[0].timestamp.getTime();
                const hasCognitiveLoad = currentSessionHasStateChange;
                const hasNavigationOrRead = nextSession.some(e => ['history_viewed', 'details_expanded'].includes(e.event));

                // 1. Passive Orientation: Navigation without cognitive event
                if (!hasCognitiveLoad && hasNavigationOrRead) {
                    result.passive_orientation++;
                    userCohorts.forEach(c => c.passive_orientation++);
                    result.logs.push(`U:${user.id} Class: Passive Orientation.`);
                    continue; // Not discarded, but NOT spontaneousReturn (Intent)
                }

                // 2. UI Reassurance (System Check): No cog load, no navigation, short duration
                if (!hasCognitiveLoad && !hasNavigationOrRead && sessionDuration < 45 * 1000) {
                    if (!result.discards.ui_reassurance_window) result.discards.ui_reassurance_window = 0;
                    result.discards.ui_reassurance_window++;

                    userCohorts.forEach(c => {
                        if (!c.discards.ui_reassurance_window) c.discards.ui_reassurance_window = 0;
                        c.discards.ui_reassurance_window++;
                    });

                    result.logs.push(`U:${user.id} Discarded: UI Reassurance (System check only).`);
                    continue;
                }

                result.spontaneousReturns++;
                userCohorts.forEach(c => c.spontaneousReturns++);

                const bucket = latencyHours <= 6 ? '0-6h' : (latencyHours <= 24 ? '6-24h' : (latencyHours <= 72 ? '24-72h' : '>72h'));
                result.distribution[bucket]++;
                userCohorts.forEach(c => c.distribution[bucket]++);
                result.logs.push(`U:${user.id} KEEP: ${latencyHours.toFixed(1)}h latency.`);
            }
        }

        result.status = result.effectiveN < 15 ? 'INSUFFICIENT_EVIDENCE' : 'STABLE_SIGNAL';
        result.logs = result.logs.slice(-30);
        return result;
    }
}
