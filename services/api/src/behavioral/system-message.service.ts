import { Injectable } from '@nestjs/common';
import { MessageGenerationService, MessageInput } from './message-generation.service';
import { ProtocolContentService } from '../content/protocol-content.service';

@Injectable()
export class SystemMessageService {
    constructor(
        private messageGen: MessageGenerationService,
        private contentService: ProtocolContentService
    ) { }

    buildDailySystemState(userState: any) {
        const context = userState.context || {};
        const day = context.day || 1;
        const protocolId = userState.program_id || 'circadian_reset_14';
        const minimalMode = context.minimalMode || { enabled: false, level: 0 };

        // 1. Get Content (Day-based)
        const protocol = this.contentService.getTodayProtocolContent(
            protocolId,
            day,
            minimalMode,
            { completedDays: context.completedDays ?? (day - 1) }
        );

        // 2. Prepare Message Input
        const messageInput: MessageInput = {
            protocolId: protocolId,
            day: day,
            phaseId: userState.state || 'stable', // Or map from day if needed
            adherence7d: context.adherence7d ?? 1.0,
            consecutiveFailures: context.consecutiveFailures || 0,
            inactivityHours: this.calculateInactivityHours(userState.lastActive),
            frictionScore: context.friction?.score || 0,
            lastCheckOptionId: context.lastCheckOptionId,
            minimalModeLevel: minimalMode.enabled ? minimalMode.level : 0
        };

        // 3. Generate Deterministic Message
        const message = this.messageGen.generateMessage(messageInput);

        return {
            day,
            protocol,
            message, // This now contains { type, tone, key }
            instrument: {
                load: minimalMode.enabled ? 'reduced' : 'normal',
                minimalMode
            }
        };
    }

    private calculateInactivityHours(lastActive?: string | Date): number {
        if (!lastActive) return 0;
        const last = new Date(lastActive);
        const now = new Date();
        return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60));
    }
}

