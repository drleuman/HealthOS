/**
 * HEALTHOS — BEHAVIORAL MESSAGE MATRIX
 * Deterministic Prompt System
 *
 * The system never motivates.
 * The system explains physiological state.
 */

export type MessageType =
    | "orientation"
    | "normalization"
    | "simplification"
    | "reinforcement"
    | "reengagement"
    | "closure"
    | "transition";

export type FrictionType =
    | "none"
    | "fatigue"
    | "forgetting"
    | "schedule_conflict"
    | "skepticism"
    | "overeffort";

export interface UserState {
    day: number;
    adherence: number; // %
    failures: number;
    perception?: "better" | "same" | "worse";
    friction?: FrictionType;
}

export const MESSAGE_MATRIX = {
    orientation: [
        "Hoy iniciamos ajuste de fase biológica.",
        "El objetivo actual es sincronizar señales temporales.",
        "Hoy registramos la primera referencia fisiológica."
    ],

    normalization: {
        fatigue: [
            "Más cansancio inicial es esperable al adelantar fase.",
            "La somnolencia temprana indica reajuste circadiano.",
            "El cerebro está desplazando la hora biológica."
        ],
        skepticism: [
            "La ausencia de efecto inmediato es esperable.",
            "Los cambios circadianos no son perceptibles el primer día.",
            "El sistema requiere repetición antes de mostrar efecto."
        ],
        same: [
            "Sin cambios detectables aún es estado esperado.",
            "El sistema todavía está calibrando referencias.",
            "La adaptación ocurre antes de ser percibida."
        ],
        // Fallback for general normalization
        default: [
            "La variabilidad es parte del proceso de calibración.",
            "El cuerpo necesita tiempo para integrar la nueva señal.",
            "Es normal sentir resistencia al cambio de ritmo."
        ]
    },

    simplification: [
        "Reducimos la acción al mínimo efectivo hoy.",
        "Solo mantén la señal principal hoy.",
        "La consistencia es prioritaria sobre la intensidad."
    ],

    reinforcement: [
        "La respuesta observada coincide con adaptación biológica.",
        "El patrón registrado es compatible con ajuste correcto.",
        "La señal está siendo integrada."
    ],

    reengagement: [
        "Reanudamos desde el último punto estable.",
        "No es necesario compensar días previos.",
        "La continuidad empieza hoy."
    ],

    closure: [
        "El patrón circadiano básico está establecido.",
        "La fase biológica es ahora más predecible.",
        "Finaliza la etapa de sincronización inicial."
    ],

    transition: [
        "A partir de ahora añadimos regulación metabólica.",
        "La base circadiana permite ampliar estímulos.",
        "Comienza la fase de estabilización."
    ],

    containment: [
        "Suficiente por hoy. No añadas más carga.",
        "El descanso es parte de la activación.",
        "Más no es mejor. Mejor es suficiente."
    ]
};
