import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface BioSignals {
    stability: number;
    energyVariability: number;
    recoveryLatency: number;
    circadianAlignment: number;
    nervousSystemActivation: number;
    metabolicRigidity: number;
    interventionSensitivity: number;
    relapsePressure: number;
}

@Injectable()
export class StateTrajectoryService {
    private readonly logger = new Logger(StateTrajectoryService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Reconstruct the biological state of a user for a specific date
     * by analyzing latent behavioral signals.
     */
    async reconstructState(userId: string, date: Date = new Date()): Promise<any> {
        this.logger.log(`Reconstructing state for user ${userId} on ${date.toISOString()}`);

        // 1. Fetch Window: Current day + 7 day lookback
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 7);

        const events = await this.prisma.event.findMany({
            where: {
                userId,
                timestamp: { gte: startDate, lte: date },
            },
            orderBy: { timestamp: 'asc' },
        });

        const logs = await this.prisma.dailyLog.findMany({
            where: {
                userId,
                createdAt: { gte: startDate, lte: date },
            },
            orderBy: { createdAt: 'asc' },
        });

        const assessment = await this.prisma.assessments.findUnique({ where: { userId } });

        // 2. Compute Signals
        const signals = this.computeBioSignals(events, logs, assessment);

        // 3. Determine Dominant State
        const dominantState = this.determineDominantState(signals);

        // 4. Persist Snapshot
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);

        return (this.prisma as any).dailyStateSnapshot.upsert({
            where: {
                userId_date: {
                    userId,
                    date: dayStart,
                },
            },
            create: {
                userId,
                date: dayStart,
                ...signals,
                dominantState,
            },
            update: {
                ...signals,
                dominantState,
            },
        });
    }

    private computeBioSignals(events: any[], logs: any[], assessment: any): BioSignals {
        // A. CIRCADIAN ALIGNMENT
        // Calculate variance in start timestamps
        const startTimes = events
            .filter(e => e.event === 'day_started')
            .map(e => {
                const d = new Date(e.timestamp);
                return d.getHours() * 60 + d.getMinutes();
            });

        const circadianAlignment = this.calculateRegularityScore(startTimes);

        // B. NERVOUS SYSTEM ACTIVATION (Friction)
        // Measure time between start and complete events
        const completionDurations = this.calculateCompletionDurations(events);
        const avgDuration = completionDurations.length > 0
            ? completionDurations.reduce((a, b) => a + b, 0) / completionDurations.length
            : 300; // default 5 mins

        // If duration > 2x baseline, activation is high
        const nervousSystemActivation = Math.min(1, avgDuration / 3600); // capped at 1h

        // C. RECOVERY LATENCY
        // Look for patterns of Success -> Fail -> Success
        const recoveryLatency = this.calculateRecoverySpeed(logs);

        // D. STABILITY (Composite)
        const stability = (circadianAlignment + (1 - nervousSystemActivation)) / 2;

        // E. METABOLIC RIGIDITY
        // High rigidity if the user cannot adapt to protocol time-shifts
        const metabolicRigidity = circadianAlignment < 0.3 ? 0.8 : 0.2;

        // F. INTERVENTION SENSITIVITY
        // How much does state improve compared to previous snapshots?
        // For now, heuristic: adherence-driven sensitivity
        const adherence = logs.filter(l => l.actionCompleted).length / (logs.length || 1);
        const interventionSensitivity = adherence > 0.8 ? 0.7 : 0.3;

        // G. ENERGY VARIABILITY
        // Inferred from erratic interaction timing
        const energyVariability = 1 - circadianAlignment;

        // H. RELAPSE PRESSURE
        // High if stability is dropping while activation is rising
        const relapsePressure = (nervousSystemActivation * 0.7) + ((1 - stability) * 0.3);

        return {
            stability,
            energyVariability,
            recoveryLatency,
            circadianAlignment,
            nervousSystemActivation,
            metabolicRigidity,
            interventionSensitivity,
            relapsePressure,
        };
    }

    private calculateRegularityScore(times: number[]): number {
        if (times.length < 2) return 0.5;
        const mean = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        // 0 stdDev = 1.0 score, 120min stdDev = 0.0 score
        return Math.max(0, 1 - stdDev / 120);
    }

    private calculateCompletionDurations(events: any[]): number[] {
        const durations: number[] = [];
        const sessions: Map<string, Date> = new Map();

        for (const e of events) {
            if (e.event === 'day_started' && e.sessionId) {
                sessions.set(e.sessionId, new Date(e.timestamp));
            } else if (e.event === 'day_completed' && e.sessionId) {
                const startTime = sessions.get(e.sessionId);
                if (startTime) {
                    durations.push((new Date(e.timestamp).getTime() - startTime.getTime()) / 1000);
                    sessions.delete(e.sessionId); // avoid double counting
                }
            }
        }
        return durations;
    }

    private calculateRecoverySpeed(logs: any[]): number {
        // 1.0 = immediate recovery (next day)
        // 0.0 = persistent failure (3+ days)
        let failures = 0;
        let maxFailStreak = 0;
        logs.forEach(l => {
            if (!l.actionCompleted) failures++;
            else {
                if (failures > maxFailStreak) maxFailStreak = failures;
                failures = 0;
            }
        });
        return maxFailStreak === 0 ? 1.0 : Math.max(0, 1 - maxFailStreak / 4);
    }

    private determineDominantState(s: BioSignals): string {
        if (s.relapsePressure > 0.7) return 'crisis';
        if (s.stability > 0.8) return 'stabilized';
        if (s.nervousSystemActivation > 0.6) return 'perturbation';
        return 'adaptation';
    }

    /**
     * Get the trajectory for the Control Center
     */
    async getTrajectory(userId: string, limit: number = 30): Promise<any> {
        return this.prisma.dailyStateSnapshot.findMany({
            where: { userId },
            orderBy: { date: 'asc' },
            take: limit,
        });
    }
}
