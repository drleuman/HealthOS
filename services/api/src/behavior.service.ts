import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PerceptionInterpreter } from './behavioral/perception.interpreter';
import { StateEngine } from './behavioral/state.engine';
import { MessageGenerationService } from './behavioral/message-generation.service';
import { ProtocolEngine } from './behavioral/protocol.engine';

@Injectable()
export class BehaviorService {
    private readonly logger = new Logger(BehaviorService.name);

    constructor(
        private prisma: PrismaService,
        private perceptionInterpreter: PerceptionInterpreter,
        private stateEngine: StateEngine,
        private messageGenerationService: MessageGenerationService,
        private protocolEngine: ProtocolEngine
    ) { }

    async processDailyLog(userId: string, logData: {
        day: number,
        actionCompleted: boolean,
        selfReportEffect?: any, // JSON
        // Additional context needed for interpretation
        programContext?: any
    }) {
        this.logger.log(`Processing daily log for user ${userId} / Day ${logData.day}`);

        // 1. Persist Raw Log
        // Note: Assuming 'selfReportEffect' is passed as the feedback value ('worse', 'better', etc.)
        // OR the full check object. For MVP interpretation, we need the simplified values.

        // Map boolean to status
        const actionStatus = logData.actionCompleted ? 'completed' : 'failed';

        // Extract feedback value (assuming payload structure)
        const feedbackValue = logData.selfReportEffect?.value || logData.selfReportEffect;

        // Fetch current state for gap calculation and status check
        const currentState = await this.prisma.userBehaviorState.findUnique({ where: { userId } });
        const context = (currentState?.context as any) || {};

        let isSpontaneousReturn = false;
        if ((currentState as any)?.status === 'COMPLETED') {
            const lastLogBeforeThis = await this.prisma.dailyLog.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
            if (lastLogBeforeThis) {
                const msGap = new Date().getTime() - lastLogBeforeThis.createdAt.getTime();
                const daysGap = msGap / (1000 * 60 * 60 * 24);
                if (daysGap >= 5) {
                    isSpontaneousReturn = true;
                    this.logger.log(`Detected spontaneous return for user ${userId} after ${daysGap.toFixed(1)} days.`);
                }
            }
        }

        const log = await (this.prisma as any).dailyLog.create({
            data: {
                userId,
                day: logData.day,
                actionCompleted: logData.actionCompleted,
                selfReportEffect: logData.selfReportEffect,
                context: isSpontaneousReturn ? { spontaneous_return: true } : undefined
            }
        });

        // 2. Fetch User Context + Metrics (already fetched above as context)
        // 2. Build Metrics for Analysis (UIG)
        const lastLogs = await this.prisma.dailyLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        const historyWithTime = lastLogs
            .filter(l => l.selfReportEffect)
            .map(l => ({ effect: l.selfReportEffect as string, at: l.createdAt.toISOString() }));

        const lastActive = currentState?.updatedAt || new Date();
        const gapHours = Math.floor((new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60));

        const metrics = {
            consecutiveCompletions: (context as any).consecutiveSuccess || 0,
            consecutiveFailures: (context as any).consecutiveFailures || 0,
            consecutiveMisses: (context as any).consecutiveMisses || 0,
            stagnationDays: (context as any).stagnationDays || 0,
            gapHours,
            timeToLogMinutes: 0, // Placeholder
            checkEffectHistory: context.checkEffectHistory || [],
            checkEffectHistoryWithTime: historyWithTime,
            navigationFlags: { historyViewed: false, detailsExpanded: false } // Placeholder
        };

        // 3. Interpret Signals (UIG)
        const analysis = await this.perceptionInterpreter.interpret({
            userId,
            day: logData.day,
            actionStatus,
            feedback: feedbackValue,
            timestamp: new Date(),
            metrics,
            context: {
                ...context,
                isAdaptationExpected: logData.programContext?.isAdaptation,
                isSpontaneousReturn,
                protocolStatus: (currentState as any)?.status
            }
        });

        // 4. Update Behavioral State
        await this.stateEngine.updateState(userId, analysis, context, metrics);

        // 5. Execute Protocol Action (Advance/Repeat/Simplify)
        const protocolResult = await this.protocolEngine.executeAction(userId, analysis.protocolAction, logData.day);

        // 5.5 Check for closure
        const closure = await this.protocolEngine.evaluateClosure(userId);
        if (closure.shouldClose && closure.completionType) {
            await this.protocolEngine.closeProtocol(userId, closure.completionType);
        }

        // Fetch final state for message generation and return
        const finalState = await this.prisma.userBehaviorState.findUnique({ where: { userId } });

        // 6. Generate System Message (Pass status/completionType for matrix matching)
        const finalCtx = (finalState?.context as any) || {};
        const canSuggestReentry = !finalCtx.reentry?.cooldownUntil ||
            new Date(finalCtx.reentry.cooldownUntil).getTime() <= Date.now();

        const message = this.messageGenerationService.generateMessage({
            ...analysis,
            protocolId: logData.programContext?.programId || 'circadian_reset_14',
            day: logData.day,
            protocolStatus: (finalState as any)?.status || 'ACTIVE',
            completionType: closure.completionType,
            minimalModeLevel: (finalState?.context as any)?.minimalMode?.level || 0,
            isSpontaneousReturn,
            deviationType: analysis.deviation?.type,
            canSuggestReentry
        } as any);

        // 7. Audit Trail (BehaviorAnalysis)
        await this.prisma.behaviorAnalysis.create({
            data: {
                userId,
                day: logData.day,
                userAction: actionStatus,
                userFeedback: typeof feedbackValue === 'string' ? feedbackValue : 'unknown',
                primarySignal: analysis.signal,
                detectedCognitiveState: analysis.cognitiveState,
                phaseProgress: analysis.phaseProgress,
                systemResponseType: analysis.recommendedResponse,
                generatedMessage: message.key
            }
        });

        return {
            logId: log.id,
            analysis,
            protocolAction: analysis.protocolAction,
            nextDay: protocolResult.nextDay,
            systemMessage: message,
            newState: finalState
        };
    }

    async computeSnapshotForUser(userId: string, now: Date) {
        const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const prismaAny = this.prisma as any;

        // 1. Fetch Events
        const eventsLast7 = await this.prisma.event.findMany({
            where: {
                userId,
                timestamp: { gte: aWeekAgo }
            },
            select: { event: true, timestamp: true, context: true }
        });

        if (eventsLast7.length === 0) {
            return null; // No activity to snapshot
        }

        // 2. Compute Metrics

        // A) startedDaysLast7: distinct count of days with 'day_started' or 'day_viewed'
        const startedDays = new Set(
            eventsLast7
                .filter((e: any) => e.event === 'day_started' || e.event === 'day_viewed')
                .map((e: any) => e.timestamp.toISOString().split('T')[0])
        );
        const startedDaysLast7 = startedDays.size;

        // B) completedDaysLast7: distinct count of days with 'day_completed'
        const completedDaysLast7 = new Set(
            eventsLast7
                .filter((e: any) => e.event === 'day_completed')
                .map((e: any) => e.timestamp.toISOString().split('T')[0])
        ).size;

        // C) repeatedOpeningsSameDay (Friction signal)
        // Definition: Multiple 'day_viewed' or 'day_started' for the same 'day' context today
        const eventsToday = eventsLast7.filter((e: any) => e.timestamp >= startOfToday);
        const dayOpeningsMap: Record<number, number> = {};
        let repeatedCount = 0;

        eventsToday.forEach((e: any) => {
            if (e.event === 'day_viewed' || e.event === 'day_started') {
                const day = (e.context as any)?.day;
                if (day !== undefined) {
                    dayOpeningsMap[day] = (dayOpeningsMap[day] || 0) + 1;
                }
            }
            if (e.event === 'lesson_replayed') {
                repeatedCount++; // Direct signal
            }
        });

        // Add cases where same day was opened > 1 time
        Object.values(dayOpeningsMap).forEach(count => {
            if (count > 1) repeatedCount += (count - 1);
        });
        const repeatedOpeningsSameDay = repeatedCount;

        // D) inactive48h: last event using reduce (no mutation)
        const lastEventTimestamp = eventsLast7.reduce((latest: Date, current: any) => {
            return current.timestamp > latest ? current.timestamp : latest;
        }, new Date(0));

        const hoursSinceLastEvent = (now.getTime() - lastEventTimestamp.getTime()) / (1000 * 60 * 60);
        const inactive48h = hoursSinceLastEvent > 48;

        // 3. Upsert Snapshot
        return prismaAny.userBehaviorSnapshot.upsert({
            where: {
                userId_date: {
                    userId,
                    date: startOfToday
                }
            },
            update: {
                startedDaysLast7,
                completedDaysLast7,
                repeatedOpeningsSameDay,
                inactive48h,
            },
            create: {
                userId,
                date: startOfToday,
                startedDaysLast7,
                completedDaysLast7,
                repeatedOpeningsSameDay,
                inactive48h,
            }
        });
    }

    async determineState(snapshot: any) {
        let state = 'on_track';

        // Rule 1: Action too hard (started multiple times but never finished in a week)
        if (snapshot.startedDaysLast7 >= 2 && snapshot.completedDaysLast7 === 0) {
            state = 'action_too_hard';
        }
        // Rule 2: Instruction unclear / Technical friction (repeatedly opening same day without completion)
        else if (snapshot.repeatedOpeningsSameDay >= 3 && snapshot.completedDaysLast7 === 0) {
            state = 'instruction_unclear';
        }
        // Rule 3: Early dropoff (inactive after only 1-2 days of successful use)
        else if (snapshot.inactive48h && snapshot.completedDaysLast7 < 3) {
            state = 'early_dropoff';
        }
        // Rule 4: Motivation loss (inactive after a streak of 3+ days)
        else if (snapshot.inactive48h && snapshot.completedDaysLast7 >= 3) {
            state = 'motivation_loss';
        }

        return state;
    }

    async runBehaviorAnalysisJob() {
        this.logger.log('Starting Behavior Analysis Job...');
        const now = new Date();
        const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prismaAny = this.prisma as any;

        try {
            // Optimization: Only process users with events in the last 7 days
            const recentEvents = await this.prisma.event.findMany({
                where: {
                    timestamp: { gte: aWeekAgo },
                    userId: { not: null }
                },
                select: { userId: true },
                distinct: ['userId']
            });

            const activeUserIds = recentEvents.map((e: any) => e.userId as string);
            this.logger.log(`Processing behavior analysis for ${activeUserIds.length} active users.`);

            let processed = 0;
            for (const userId of activeUserIds) {
                try {
                    const snapshot = await this.computeSnapshotForUser(userId, now);
                    if (!snapshot) continue;

                    const state = await this.determineState(snapshot);

                    // Auto-termination check (14 days inactivity)
                    const lastLog = await this.prisma.dailyLog.findFirst({
                        where: { userId },
                        orderBy: { createdAt: 'desc' }
                    });

                    const daysInactive = lastLog
                        ? (now.getTime() - lastLog.createdAt.getTime()) / (1000 * 60 * 60 * 24)
                        : 0;

                    if (daysInactive >= 14) {
                        const closure = await this.protocolEngine.evaluateClosure(userId, { autoTerminate: true });
                        if (closure.shouldClose && closure.completionType) {
                            await this.protocolEngine.closeProtocol(userId, closure.completionType, {
                                autoReason: `Inactivity for ${Math.floor(daysInactive)} days`
                            });
                            this.logger.log(`Auto-terminated protocol for user ${userId} due to inactivity.`);
                            processed++;
                            continue; // Skip normal upsert if terminated
                        }
                    }

                    await prismaAny.userBehaviorState.upsert({
                        where: { userId },
                        update: { state },
                        create: { userId, state }
                    });
                    processed++;
                } catch (e: any) {
                    this.logger.error(`Behavior Job failed for user ${userId}: ${e.message}`);
                }
            }

            this.logger.log(`Behavior Analysis Job Complete. Processed ${processed} users.`);
            return { processed };
        } catch (error: any) {
            // Harden against missing migrations
            if (error.code === 'P2021' || error.message.includes('relation') || error.message.includes('UserBehavior')) {
                this.logger.error('Behavior tables missing — run migrations. Skipping job.');
                return { processed: 0, error: 'Database schema mismatch' };
            }
            throw error;
        }
    }

    async getUserState(userId: string) {
        const prismaAny = this.prisma as any;
        try {
            const state = await prismaAny.userBehaviorState.findUnique({
                where: { userId }
            });

            const lastSnapshot = await prismaAny.userBehaviorSnapshot.findFirst({
                where: { userId },
                orderBy: { date: 'desc' }
            });

            if (!state) return { state: 'unknown', lastSnapshot: null };

            return {
                ...state,
                lastSnapshot
            };
        } catch (e) {
            return { state: 'error', message: 'Migration missing or database issue' };
        }
    }

    async getUserHistory(userId: string) {
        // Fetch logs ordered by day descending
        const logs = await this.prisma.dailyLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 for now
        });

        // Map to frontend HistoryItem shape
        return {
            items: logs.map(log => ({
                id: log.id,
                ts: log.createdAt.toISOString(),
                day: log.day,
                actionType: log.actionCompleted ? (log.selfReportEffect ? 'check_completed' : 'action_completed') : 'failed', // Simplified mapping
                // If we store specific action types in DailyLog, we should map them.
                // Currently DailyLog schema has 'actionCompleted' boolean. 
                // We might need to look at 'programContext' or infer.
                // For MVP, let's just return what we have.
                // Actually, the user prompts implied 'actionType' is stored. 
                // In my schema, DailyLog has no 'actionType' column! 
                // It has 'selfReportEffect' (JSON).
                // Let's check how 'processDailyLog' stores it. 
                // it receives 'logData' but only stores 'actionCompleted'.
                // Ideally we should have stored 'actionType'. start of MVP limitation.
                // I will return generic types for now.
                value: log.selfReportEffect
            })),
            lastRecordedAt: logs.length > 0 ? logs[0].createdAt.toISOString() : null
        };
    }

    async manualClose(userId: string, opts: { userRequested: boolean; reason?: string }) {
        const closure = await this.protocolEngine.evaluateClosure(userId, opts);
        if (!closure.shouldClose || !closure.completionType) {
            return { ok: false, reason: 'Closure criteria not met' };
        }

        const finalState = await this.protocolEngine.closeProtocol(userId, closure.completionType, { manualReason: opts.reason });

        // Generate message for closure
        const message = this.messageGenerationService.generateMessage({
            protocolId: finalState.programId,
            day: finalState.dayIndex,
            protocolStatus: 'COMPLETED',
            completionType: closure.completionType,
            adherence7d: (finalState.context as any)?.adherence7d || 0,
            consecutiveFailures: (finalState.context as any)?.consecutiveFailures || 0,
            inactivityHours: 0,
            frictionScore: (finalState.context as any)?.friction?.score || 0,
            minimalModeLevel: (finalState.context as any)?.minimalMode?.level || 0,
            phaseId: finalState.currentPhase || 'closure'
        } as any);

        return {
            ok: true,
            status: 'COMPLETED',
            systemMessage: message,
            newState: finalState
        };
    }

    async reactivateProtocol(userId: string) {
        const finalState = await this.protocolEngine.reactivateProtocol(userId);

        // Generate a fresh message for the re-entry
        const message = this.messageGenerationService.generateMessage({
            protocolId: (finalState as any).programId,
            day: finalState.dayIndex,
            protocolStatus: 'ACTIVE',
            minimalModeLevel: (finalState.context as any)?.minimalMode?.level || 0,
            phaseId: finalState.currentPhase || 'detection'
        } as any);

        return {
            ok: true,
            status: 'ACTIVE',
            systemMessage: message,
            newState: finalState
        };
    }
}
