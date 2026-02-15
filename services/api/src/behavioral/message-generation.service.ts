import { Injectable, Logger } from '@nestjs/common';
import { PerceptionOutput } from './perception.interpreter';
import { MESSAGE_MATRIX, UserState } from './prompt-matrix';

@Injectable()
export class MessageGenerationService {
    private readonly logger = new Logger(MessageGenerationService.name);

    generateMessage(analysis: PerceptionOutput): string {
        this.logger.log(`Generating message for: ${analysis.recommendedResponse} / ${analysis.signal}`);

        // Map PerceptionOutput to Matrix UserState (simplified for Matrix logic)
        // In a real scenario, we might need more context passed in or fetched.
        // For now, we derive what we can.

        const state: UserState = {
            day: 0, // We need 'day' in PerceptionOutput or context to be accurate.
            adherence: 100, // Placeholder
            failures: analysis.cognitiveState === 'overwhelmed' ? 2 : 0, // Infer
            perception: this.mapSignalToPerception(analysis.signal),
            friction: 'none' // Default
        };

        return this.selectMessage(analysis.recommendedResponse, state);
    }

    generateMinimalMessage(enabled: boolean): string | null {
        if (!enabled) return null;
        // FUTURE: Check locale here if available in context
        return "Carga reducida activa. Se registra solo la señal base.";
    }

    private selectMessage(responseType: string, state: UserState): string {
        // Direct Mapping from Response Type (System Decision) -> Matrix Category

        if (responseType === 'simplification') return this.pick(MESSAGE_MATRIX.simplification);
        if (responseType === 'containment') return this.pick(MESSAGE_MATRIX.containment);
        if (responseType === 'reinforcement') return this.pick(MESSAGE_MATRIX.reinforcement);
        if (responseType === 'transition') return this.pick(MESSAGE_MATRIX.transition);

        if (responseType === 'normalization') {
            // Sub-select based on perception/friction
            if (state.perception === 'worse') return this.pick(MESSAGE_MATRIX.normalization.fatigue);
            if (state.perception === 'same') return this.pick(MESSAGE_MATRIX.normalization.same);
            return this.pick(MESSAGE_MATRIX.normalization.default);
        }

        if (responseType === 'orientation') {
            // Fallback to orientation
            return this.pick(MESSAGE_MATRIX.orientation);
        }

        // Fallback
        return this.pick(MESSAGE_MATRIX.orientation);
    }

    private mapSignalToPerception(signal: string): "better" | "same" | "worse" | undefined {
        if (signal === 'positive_shift') return 'better';
        if (signal === 'adaptation_response' || signal === 'overload_response') return 'worse';
        if (signal === 'null_response') return 'same';
        return undefined;
    }

    private pick(arr: string[]): string {
        if (!arr || arr.length === 0) return "Sistemas nominales."; // Safety
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
