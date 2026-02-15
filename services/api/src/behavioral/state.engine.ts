import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PerceptionOutput } from './perception.interpreter';

@Injectable()
export class StateEngine {
    private readonly logger = new Logger(StateEngine.name);

    constructor(private prisma: PrismaService) { }

    async updateState(userId: string, analysis: PerceptionOutput, rawContext: any) {
        this.logger.log(`Updating state for user ${userId} -> Phase: ${analysis.phaseProgress}`);

        // 1. Fetch current state
        const currentState = await this.prisma.userBehaviorState.findUnique({
            where: { userId }
        });

        // 2. Compute new state values
        const newPhase = analysis.phaseProgress; // The Interpreter is the source of truth for Phase
        const newCognitiveState = analysis.cognitiveState;

        // 3. Update Context (rolling metrics)
        const currentContext = (currentState?.context as any) || {};
        const newContext = {
            ...currentContext,
            lastSignal: analysis.signal,
            consecutiveFailures: analysis.signal === 'cognitive_confusion' || analysis.signal === 'logistical_block'
                ? (currentContext.consecutiveFailures || 0) + 1
                : 0,
            consecutiveSuccess: analysis.signal === 'consistent_execution'
                ? (currentContext.consecutiveSuccess || 0) + 1
                : 0,
            lastUpdate: new Date().toISOString()
        };

        // 4. Persist State
        await this.prisma.userBehaviorState.upsert({
            where: { userId },
            update: {
                currentPhase: newPhase,
                cognitiveState: newCognitiveState,
                context: newContext,
                state: analysis.recommendedResponse // Store the 'Active Mode' of the system (e.g. 'normalization')
            },
            create: {
                userId,
                state: analysis.recommendedResponse,
                currentPhase: newPhase,
                cognitiveState: newCognitiveState,
                context: newContext
            }
        });

        return {
            newPhase,
            newCognitiveState,
            systemMode: analysis.recommendedResponse
        };
    }
}
