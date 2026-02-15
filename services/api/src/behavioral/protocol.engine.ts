import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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

@Injectable()
export class ProtocolEngine {
    private readonly logger = new Logger(ProtocolEngine.name);

    constructor(private prisma: PrismaService) { }

    async executeAction(userId: string, action: 'advance' | 'repeat' | 'simplify', currentDay: number) {
        this.logger.log(`Executing Protocol Action for ${userId}: ${action}`);

        // 1. Fetch current context
        const state = await this.prisma.userBehaviorState.findUnique({ where: { userId } });
        const ctx = ((state as any)?.context as any) || {};

        // 2. Determine new Minimal Mode state
        // We calculate this based on the *result* of the action (and previous context).
        // If action is 'simplify', we force a check, but the logic is usually self-contained.
        // Actually, 'action' comes from Interpreter, which sees failures.
        // So if action == simplify, we MUST trigger entry if not already there.
        // But let's use the robust function that checks all signals.

        // We need to pass the "latest" metrics which are in 'ctx' (updated by StateEngine just before this).
        // StateEngine updates ctx.consecutiveFailures etc.

        const now = new Date();
        const updatedMinimalMode = this.updateMinimalMode(ctx, now);

        // Explicit override: If Interpreter said "simplify" but logic didn't trigger, force it?
        // The User Prompt says: "Activa Minimal Mode si se cumple cualquiera... consecutiveFails >= 2". 
        // Interpreter returns 'simplify' exactly when fails >= 2. So they align.
        // But let's ensure:
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
            // ACTUALLY Advance the day pointer
            // TODO: In a real app, this might be a separate "DayEngine", but here we do it.
            // However, typically we verify if "next day content" exists.
            return { nextDay: currentDay + 1 };
        }

        return { nextDay: currentDay };
    }

    private updateMinimalMode(ctx: BehaviorContext, now: Date): MinimalModeState {
        // Default empty state if not exists
        const mm = ctx.minimalMode || { enabled: false, level: 0, recoveryStreak: 0 };

        // Normalize Context Keys (StateEngine uses consecutiveFailures, Schema uses same)
        // We map them to local variables for clarity
        const misses = ctx.consecutiveMisses || 0;
        const fails = ctx.consecutiveFailures || 0; // StateEngine updates this
        const frictionScore = ctx.friction?.score || 0;
        const adherence = ctx.adherence7d !== undefined ? ctx.adherence7d : 1; // Default to 1 (100%) if missing

        // --- ENTRY LOGIC ---
        if (!mm.enabled) {
            if (misses >= 2) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'miss_48h', recoveryStreak: 0 };
            if (fails >= 2) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'fail_streak', recoveryStreak: 0 };
            if (frictionScore >= 0.75) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'high_friction', recoveryStreak: 0 };
            if (adherence < 0.35) return { enabled: true, level: 1, enteredAt: now.toISOString(), reason: 'low_capacity', recoveryStreak: 0 };

            return mm; // No change
        }

        // --- ESCALATATION LOGIC ---
        if (mm.enabled && mm.level === 1 && misses >= 4) {
            return { ...mm, level: 2 };
        }

        // --- EXIT LOGIC ---
        // Recovery Streak is updated OUTSIDE this function (in BehaviorService or StateEngine) usually?
        // No, we should calculate it based on *did they succeed today*?
        // But this function runs *after* the log is processed.
        // If StateEngine updated 'consecutiveSuccess', we can use that!
        // The user prompt says: "recoveryStreak sube cuando el usuario completa el mínimo".
        // In StateEngine, 'consecutiveSuccess' resets on fail.
        // So we can proxy 'recoveryStreak' with 'consecutiveSuccess' if looking for strict continuity.
        // Or we can track it separately in MinimalModeState using the current action.

        // For strict adherence to the prompt which asked for "recoveryStreak in MinimalModeState", 
        // we need to know if TODAY was a success. 
        // We don't have that boolean here easily without checking the Log again or passing it.
        // However, Context has `consecutiveSuccess`. 
        // If `consecutiveSuccess` > last `consecutiveSuccess`, then they succeeded.
        // Simple heuristic: If `consecutiveSuccess` >= 1, they are on a roll. 
        // But `recoveryStreak` implies accumulating WHILE in Minimal Mode.

        // Let's assume we update `recoveryStreak` based on `consecutiveSuccess`.
        // If `consecutiveSuccess` == 0 -> recoveryStreak = 0.
        // If `consecutiveSuccess` > 0 -> recoveryStreak = consecutiveSuccess (roughly).

        // Let's rely on `consecutiveSuccess` from the context as the source of truth for "Streak".
        const currentStreak = ctx.consecutiveSuccess || 0;

        const isEligibleExit =
            currentStreak >= 2 &&
            frictionScore < 0.5 &&
            misses === 0;

        if (isEligibleExit) {
            return { enabled: false, level: 0, recoveryStreak: 0 };
        }

        // Update internal streak mirror if we want to persist it explicitly in MM state
        return {
            ...mm,
            recoveryStreak: currentStreak
        };
    }
}
