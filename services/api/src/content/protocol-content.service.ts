import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const circadian = require('./protocols/circadian-reset.json');
import { Phase } from '../behavioral/protocol-phase.engine';

@Injectable()
export class ProtocolContentService {

    getTodayProtocolContent(phase: Phase, minimal?: { enabled: boolean; level: 0 | 1 | 2 }) {
        if (phase === 'completed') return null;

        // Type assertion or check if phase exists in JSON
        const phaseContent = (circadian.phases as any)[phase];

        if (!phaseContent) return null; // Fallback

        const content = {
            goal: phaseContent.goal,
            actions: phaseContent.actions,
            check: phaseContent.check
        };

        return this.applyMinimalMode(content, minimal);
    }

    private applyMinimalMode(
        content: { actions: any[]; check: any[] },
        minimal?: { enabled: boolean; level: 0 | 1 | 2 } // Matches MinimalModeState roughly
    ) {
        if (!minimal?.enabled || minimal.level === 0) return content;

        // Minimal logic: Keep 'light' or first action.
        const light = content.actions.find(a => a.type === 'light') ?? content.actions[0];

        const minimalActions =
            minimal.level === 2
                ? [{ ...light, minutes: Math.min(light.minutes ?? 5, 5) }] // Ultra-short
                : [{ ...light, minutes: Math.min(light.minutes ?? 10, 8) }]; // Short

        const minimalCheck =
            minimal.level === 2
                ? [] // ultra-minimal: no check
                : content.check.slice(0, 1); // 1 check max

        return {
            ...content,
            actions: minimalActions,
            check: minimalCheck
        };
    }
}
