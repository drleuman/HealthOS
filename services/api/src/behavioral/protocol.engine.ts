import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProtocolContentService } from '../content/protocol-content.service';

export interface MinimalModeState {
    enabled: boolean;
    level: 0 | 1 | 2; // 1 = minimal, 2 = ultra-minimal
    enteredAt?: string; // ISO
    exitEligibleAt?: string; // ISO
    reason?: 'miss_48h' | 'fail_streak' | 'high_friction' | 'low_capacity';
    recoveryStreak?: number;
}

export interface BehaviorContext {
    friction?: { type?: string; score?: number };
    consecutiveMisses?: number;
    consecutiveFails?: number; // mapped from consecutiveFailures
    adherence7d?: number;
    minimalMode?: MinimalModeState;
    [key: string]: any;
}

export type ProtocolStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED';
export type CompletionType = 'NATURAL_END' | 'USER_ENDED' | 'AUTO_TERMINATED_INTEGRATED' | 'AUTO_TERMINATED_DISENGAGED';

export interface ClosureDecision {
    shouldClose: boolean;
    completionType?: CompletionType;
    reason: {
        reachedEnd: boolean;
        userRequested: boolean;
        autoTerminated: boolean;
        lastDayIndex: number;
        durationDays: number;
    };
}

@Injectable()
export class ProtocolEngine {
    private readonly logger = new Logger(ProtocolEngine.name);

    constructor(
        private prisma: PrismaService,
        private contentService: ProtocolContentService
    ) { }

    async executeAction(userId: string, action: 'advance' | 'repeat' | 'simplify', currentDay: number) {
        this.logger.log(`Executing Protocol Action for ${userId}: ${action}`);

        // 1. Fetch current context
        const state = await this.prisma.userBehaviorState.findUnique({ where: { userId } });
        const ctx = ((state as any)?.context as any) || {};

        // 2. Determine new Minimal Mode state
        const now = new Date();
        const updatedMinimalMode = this.updateMinimalMode(ctx, now);

        if (action === 'simplify' && !updatedMinimalMode.enabled) {
            updatedMinimalMode.enabled = true;
            updatedMinimalMode.level = 1;
            updatedMinimalMode.enteredAt = now.toISOString();
            updatedMinimalMode.reason = 'fail_streak';
            updatedMinimalMode.recoveryStreak = 0;
        }

        // 3. Persist Context
        await this.prisma.userBehaviorState.update({
            where: { userId },
            data: {
                context: {
                    ...ctx,
                    minimalMode: updatedMinimalMode
                } as any
            }
        });

        // 4. Handle Day Progression
        if (action === 'advance') {
            return { nextDay: currentDay + 1 };
        }

        return { nextDay: currentDay };
    }

    async evaluateClosure(userId: string, opts?: { userRequested?: boolean; autoTerminate?: boolean }): Promise<ClosureDecision> {
        const state = await this.prisma.userBehaviorState.findUnique({ where: { userId } });
        if (!state) return { shouldClose: false, reason: { reachedEnd: false, userRequested: false, autoTerminated: false, lastDayIndex: 0, durationDays: 0 } };
        if ((state as any).status === 'COMPLETED') {
            const duration = this.contentService.getProtocolMeta((state as any).programId).durationDays;
            return { shouldClose: false, reason: { reachedEnd: false, userRequested: false, autoTerminated: false, lastDayIndex: (state as any).dayIndex, durationDays: duration } };
        }

        const meta = this.contentService.getProtocolMeta((state as any).programId);
        const durationDays = meta.durationDays;

        const reachedEnd = (state as any).dayIndex >= durationDays;
        const userRequested = !!opts?.userRequested;
        const autoTerminated = !!opts?.autoTerminate;

        const ctx = ((state as any).context as any) || {};
        const adherence = ctx.adherence7d || 0;

        let finalCompletionType: CompletionType | undefined = undefined;
        if (userRequested) finalCompletionType = 'USER_ENDED';
        else if (autoTerminated) {
            finalCompletionType = adherence > 60 ? 'AUTO_TERMINATED_INTEGRATED' : 'AUTO_TERMINATED_DISENGAGED';
        } else if (reachedEnd) {
            finalCompletionType = 'NATURAL_END';
        }

        return {
            shouldClose: userRequested || autoTerminated || reachedEnd,
            completionType: finalCompletionType,
            reason: {
                reachedEnd,
                userRequested,
                autoTerminated,
                lastDayIndex: (state as any).dayIndex,
                durationDays,
            },
        };
    }

    async reactivateProtocol(userId: string): Promise<any> {
        const state = await this.prisma.userBehaviorState.findUnique({ where: { userId } });
        if (!state) throw new Error('No UserBehaviorState');

        const ctx = (state.context as any) || {};

        // Reset state for minimal recalibration (3 days)
        return (this.prisma as any).userBehaviorState.update({
            where: { userId },
            data: {
                status: 'ACTIVE',
                dayIndex: 1,
                currentPhase: 'detection',
                programId: 'recalibration_3d',
                context: {
                    ...ctx,
                    deviation: ctx.deviation ? { ...ctx.deviation, active: false, clearedAt: new Date().toISOString() } : null,
                    recalibration: {
                        status: 'ACTIVE',
                        planId: 'recalibration_3d',
                        dayIndex: 1,
                        startedAt: new Date().toISOString()
                    },
                    reentryAt: new Date().toISOString()
                } as any
            }
        });
    }

    async recordReentryDecision(userId: string, decision: 'ACCEPT' | 'DECLINE', planId: string): Promise<any> {
        const state = await this.prisma.userBehaviorState.findUnique({ where: { userId } });
        if (!state) throw new Error('No UserBehaviorState');

        const ctx = (state.context as any) || {};
        const now = new Date().toISOString();

        // Idempotency: If already in this status, just return
        if (decision === 'ACCEPT' && ctx.recalibration?.status === 'ACTIVE') return state;
        if (decision === 'DECLINE' && ctx.recalibration?.status === 'DECLINED' && ctx.reentry?.declinedAt === now) return state;

        if (decision === 'ACCEPT') {
            return this.reactivateProtocol(userId);
        } else {
            return (this.prisma as any).userBehaviorState.update({
                where: { userId },
                data: {
                    context: {
                        ...ctx,
                        reentry: {
                            ...ctx.reentry,
                            declinedAt: now,
                            cooldownUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                        },
                        recalibration: {
                            status: 'DECLINED',
                            declinedAt: now,
                            reason: 'USER_PREFERS_OBSERVATION'
                        }
                    } as any
                }
            });
        }
    }

    async closeProtocol(userId: string, completionType: CompletionType, reasonNotes?: any): Promise<any> {
        const state = await this.prisma.userBehaviorState.findUnique({ where: { userId } });
        if (!state || (state as any).status === 'COMPLETED') return state;

        const programId = (state as any).programId;
        const meta = this.contentService.getProtocolMeta(programId);
        const ctx = (state.context as any) || {};

        let outcome: 'STABLE' | 'UNRESOLVED' | 'COMPLETED' = 'COMPLETED';
        if (programId === 'recalibration_3d') {
            // Determine result based on last 3 days of checks
            // For now, heuristic: if last 2 logs are 'same' or 'better' -> STABLE
            outcome = 'STABLE';
        }

        await (this.prisma as any).protocolCompletion.create({
            data: {
                userId,
                programId,
                completionType,
                adherenceRate: ctx.adherence7d || null,
                minimalModeMax: ctx.minimalMode?.level || null,
                notes: {
                    ...reasonNotes,
                    protocolVersion: meta.version,
                    closedAtDayIndex: (state as any).dayIndex,
                    recalibrationOutcome: programId === 'recalibration_3d' ? outcome : undefined
                },
            },
        });

        // If recalibration was successful, clear the deviation flag for real
        const finalCtx = {
            ...ctx,
            recalibration: {
                ...ctx.recalibration,
                status: 'COMPLETED',
                outcome,
                closedAt: new Date().toISOString()
            }
        };

        if (programId === 'recalibration_3d' && outcome === 'STABLE') {
            if (finalCtx.deviation) {
                finalCtx.deviation.active = false;
                finalCtx.deviation.resolvedAt = new Date().toISOString();
            }
        }

        return this.prisma.userBehaviorState.update({
            where: { userId },
            data: {
                status: 'COMPLETED' as any,
                completedAt: new Date(),
                context: finalCtx as any
            } as any
        });
    }

    private updateMinimalMode(ctx: BehaviorContext, now: Date): MinimalModeState {
        const mm = ctx.minimalMode || { enabled: false, level: 0, recoveryStreak: 0 };
        const misses = ctx.consecutiveMisses || 0;
        const fails = ctx.consecutiveFailures || ctx.consecutiveFails || 0;
        const frictionScore = ctx.friction?.score || 0;
        const adherence = ctx.adherence7d !== undefined ? ctx.adherence7d : 1;

        if (!mm.enabled) {
            if (misses >= 2) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'miss_48h', recoveryStreak: 0 };
            if (fails >= 2) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'fail_streak', recoveryStreak: 0 };
            if (frictionScore >= 0.75) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'high_friction', recoveryStreak: 0 };
            if (adherence < 0.35) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'low_capacity', recoveryStreak: 0 };
            return mm;
        }

        if (mm.enabled && mm.level === 1 && misses >= 4) {
            return { ...mm, level: 2 };
        }

        const currentStreak = ctx.consecutiveSuccess || 0;
        if (currentStreak >= 2 && frictionScore < 0.5 && misses === 0) {
            return { enabled: false, level: 0, recoveryStreak: 0 };
        }

        return { ...mm, recoveryStreak: currentStreak };
    }
}
