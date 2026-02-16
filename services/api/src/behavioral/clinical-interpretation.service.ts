import { Injectable } from '@nestjs/common';

export type ClinicalFlag =
    | 'alarm_symptom'
    | 'self_harm_or_immediate_danger'
    | 'peer_prescription'
    | 'diagnosis_request'
    | 'expert_dependency'
    | null;

export type ModerationAction = 'ALLOW' | 'REFRAME' | 'HOLD' | 'ESCALATE';

export interface ModerationResult {
    flag: ClinicalFlag;
    action: ModerationAction;
    overlayKey: string | null;
}

@Injectable()
export class ClinicalInterpretationService {
    private readonly matrix = {
        classes: [
            {
                id: 'alarm_symptom',
                match: [
                    /\bsangrad[oa]\b|\bsangre\b|\bheces negras\b|\bmelena\b/i,
                    /\bdesmayo\b|\bme desmay\w*\b|\bsincope\b/i,
                    /\bdolor(\s+)?(fuerte|intenso|agudo)\b/i,
                    /\bdificultad para respirar\b|\bfalta de aire\b|\bdisnea\b/i,
                    /\bpecho\b.*\bdolor\b|\bdolor\b.*\bpecho\b/i,
                    /\b(39|40)\b.*\bfiebre\b|\bfiebre\b.*\b(39|40)\b/i,
                    /\bperdida de peso\b.*\brapid\w*\b|\badelgaz\w*\b.*\brapid\w*\b/i,
                    /\bconvulsi\w*\b|\bparalisis\b|\bdebilidad\b.*\b(repentina|subita)\b/i,
                    /\bataque de panico\b.*\b(severo|muy fuerte|incontrolable)\b/i,
                ],
                action: 'ESCALATE' as ModerationAction,
            },
            {
                id: 'self_harm_or_immediate_danger',
                match: [
                    /\bme quiero morir\b|\bsuicid\w*\b|\bautolesion\w*\b|\bhacerme dano\b/i,
                    /\bno quiero vivir\b|\bme voy a matar\b/i,
                ],
                action: 'ESCALATE' as ModerationAction,
            },
            {
                id: 'peer_prescription',
                match: [
                    /\b(toma|tomate|prueba|deberias|tienes que|haz)\b.*\b(magnesio|melatonina|suplemento|medicaci\w*|pastilla|antibiotico|ansiolitico)\b/i,
                    /\b(quit(a|ar)|elimina|deja)\b.*\b(gluten|lactosa|carbohidratos|azucar)\b/i,
                    /\byo (haria|recomiendo|te recomiendo|aconsejo)\b/i,
                    /\b(medico|doctora)\b.*\b(me dijo que)\b.*\b(haz|toma|debes)\b/i,
                ],
                action: 'REFRAME' as ModerationAction,
                overlayKey: 'peer_prescription_overlay',
            },
            {
                id: 'diagnosis_request',
                match: [
                    /¿?\b(que (tengo|me pasa)|por que me pasa|que puede ser|es (normal|grave))\b\??/i,
                    /\b(esto es|sera)\b.*\b(intolerancia|candida|sibo|hipotiroidismo|ansiedad|depresion)\b/i,
                    /\bdiagnostic\w*\b|\bdiagnosticar\b|\bcausa\b.*\b(esto|de esto)\b/i,
                ],
                action: 'REFRAME' as ModerationAction,
                overlayKey: 'diagnosis_request_overlay',
            },
            {
                id: 'expert_dependency',
                match: [
                    /\b(que responda|que me diga|necesito que me digas|esperare a que)\b.*\b(la doctora|la nutricionadora|el profesional|la experta)\b/i,
                    /\b¿?que hago ahora\b\??|\bnecesito indicaciones\b|\bdime que hacer\b/i,
                ],
                action: 'REFRAME' as ModerationAction,
                overlayKey: 'expert_dependency_overlay',
            },
        ],
    };

    /**
     * Interprets the clinical nature of a text input.
     * Normalizes text before matching.
     */
    interpret(text: string): ModerationResult {
        const normalized = this.normalize(text);

        for (const cls of this.matrix.classes) {
            for (const pattern of cls.match) {
                // The regex in the provided JSON used double backslashes for string representation
                // but when constructing RegExp objects we should handle them correctly.
                // Actually, the user provided them in a JSON-ready format.
                if (pattern.test(normalized)) {
                    return {
                        flag: cls.id as ClinicalFlag,
                        action: cls.action,
                        overlayKey: (cls as any).overlayKey || null,
                    };
                }
            }
        }

        return {
            flag: null,
            action: 'ALLOW',
            overlayKey: null,
        };
    }

    private normalize(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // strip diacritics
            .replace(/\s+/g, ' ')
            .trim();
    }
}
