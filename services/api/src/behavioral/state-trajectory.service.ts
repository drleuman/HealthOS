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

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);

        // 1.5 Fetch Pre-existing Snapshots for Baseline/Trend Analysis
        const previousSnapshots = await (this.prisma as any).dailyStateSnapshot.findMany({
            where: {
                userId,
                date: { lt: dayStart, gte: new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000) }
            },
            orderBy: { date: 'asc' }
        });

        // 2. Compute Signals
        const signals = this.computeBioSignals(events, logs, assessment, previousSnapshots);

        // 3. Determine Dominant State
        const analysis = this.determineDominantState(signals, previousSnapshots);

        // 4. Persist Snapshot
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
                dominantState: analysis.state,
                metadata: analysis.metadata
            },
            update: {
                ...signals,
                dominantState: analysis.state,
                metadata: analysis.metadata
            },
        });
    }

    private computeBioSignals(events: any[], logs: any[], assessment: any, history: any[] = []): BioSignals {
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

        // D. RELAPSE PRESSURE (Inverted Stability + Trend)
        // If stability is dropping fast, pressure spikes
        const stabilitySlope = this.calculateSlope(history.map(h => h.stability));
        const relapsePressure = Math.min(1, Math.max(0,
            (1 - stability) + (stabilitySlope < -0.1 ? 0.3 : 0) // Penalty for rapid destabilization
        ));

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

    private determineDominantState(signals: BioSignals, history: any[] = []): { state: string, metadata: any } {
        const { stability, nervousSystemActivation, relapsePressure } = signals;
        const activationSlope = this.calculateSlope(history.map(h => h.nervousSystemActivation));

        let state = 'adaptation';

        if (stability > 0.8 && relapsePressure < 0.2) state = 'stabilized';
        else if (nervousSystemActivation > 0.7 || activationSlope > 0.1) state = 'perturbation'; // High activation or rapid spike
        else if (relapsePressure > 0.8) state = 'crisis';
        else if (stability < 0.4) state = 'fragile';

        return {
            state,
            metadata: {
                activationSlope,
                stabilitySlope: this.calculateSlope(history.map(h => h.stability)),
                historyLength: history.length,
                computationTimestamp: new Date().toISOString()
            }
        };
    }

    private calculateSlope(values: number[]): number {
        if (values.length < 2) return 0;
        const n = values.length;
        // Simple linear regression slope for normalized time steps
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denominator = 0;

        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (values[i] - yMean);
            denominator += (i - xMean) ** 2;
        }

        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Get the trajectory for the Control Center
     */
    async getTrajectory(userId: string, limit: number = 30): Promise<any> {
        return (this.prisma as any).dailyStateSnapshot.findMany({
            where: { userId },
            orderBy: { date: 'asc' },
            take: limit,
        });
    }
}
