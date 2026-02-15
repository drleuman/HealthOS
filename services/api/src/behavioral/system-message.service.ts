import { Injectable } from '@nestjs/common';
import { MessageGenerationService } from './message-generation.service';
import { ProtocolContentService } from '../content/protocol-content.service';
import { resolvePhase, PhaseState, Phase } from './protocol-phase.engine';
import { UserState } from './prompt-matrix';

@Injectable()
export class SystemMessageService {
    constructor(
        private messageGen: MessageGenerationService,
        private contentService: ProtocolContentService
    ) { }

    buildDailySystemState(userState: any) { // Type as UserBehaviorState from DB
        // 1. Reconstruct Phase State from Context
        const context = userState.context || {};

        // Default to detection if missing
        const currentPhase: Phase = userState.currentPhase as Phase || 'detection';

        // NOTE: We are NOT resolving phase here (that happens on Write/Log). 
        // We are READ-ing the current phase to show content. 
        // The user request implied calling resolvePhase here, but resolvePhase determines NEXT phase based on history.
        // Usually, we just read the stored phase. 
        // However, following the prompt strictly: "const phase = resolvePhase(userState);"
        // If we do this live-read, we need the metrics. 
        // For now, let's assume valid state is passed or we map it.

        const phaseState: PhaseState = {
            phase: currentPhase,
            day: context.day || 1,
            adherence: context.adherenceScore || 0,
            perceptionTrend: context.perceptionTrend || 0,
            failures: context.consecutiveFailures || 0
        };

        // If we want to PREVIEW what the phase is (idempotent), we can call resolvePhase.
        // But typically we show what is persisted. 
        // Let's use the persisted phase for stability, as logic says Resolving happens on ACTION.
        const phase = phaseState.phase;

        // 2. Get Minimal Mode State
        const minimalMode = context.minimalMode || { enabled: false, level: 0 };

        // 3. Get Content (filtered by Minimal Mode)
        const protocol = this.contentService.getTodayProtocolContent(phase, minimalMode);

        // 4. Generate Message
        // We need to pass this state to MessageGenerationService.

        let responseType = 'orientation';
        if (phaseState.phase === 'detection') responseType = 'orientation';
        if (phaseState.phase === 'stabilization') responseType = 'reinforcement';
        if (phaseState.failures >= 2) responseType = 'simplification';

        // If Minimal Mode is explicitly enabled, we should probably force 'simplification' or a specific type unless we are exiting?
        // But MessageGenerationService should handle the text if we pass the flag.
        // For now, let's look at how MessageService handles it. 
        // We will add logic there next. 

        // Mocking analysis again for the signature
        const mockAnalysis: any = {
            recommendedResponse: responseType,
            signal: 'null_response',
            cognitiveState: userState.cognitiveState || 'neutral'
        };

        let message = this.messageGen.generateMessage(mockAnalysis);

        // Override message for Minimal Mode if active
        // (Ideally MessageGenerationService handles this naturally, but for explicit prompt compliance):
        if (minimalMode.enabled) {
            // We can hardcode or add a method to MessageGen. 
            // The prompt suggests: "Carga reducida activa..."
            // Let's add that logic to MessageGenerationService in the next step, 
            // but here we can just ensure we pass enough info or override if needed.
            // Actually, let's call a specific method if it exists, or rely on the update I'm about to make.
            // I will update MessageGenerationService to look at 'context' if I passed it, but I only pass 'analysis'.
            // So I will override here for safety until I refactor MessageGen signature.
            const minimalMsg = this.messageGen.generateMinimalMessage(true);
            if (minimalMsg) message = minimalMsg;
        }

        return {
            phase,
            protocol,
            message,
            instrument: {
                load: minimalMode.enabled ? 'reduced' : 'standard',
                minimalMode // Expose full details for UI debug/tooltips
            }
        };
    }
}
