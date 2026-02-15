/**
 * HEALTHOS — PROTOCOL PHASE ENGINE
 *
 * A protocol is not a list of days.
 * A protocol is a progression of physiological states.
 *
 * Phases:
 * 1) DETECTION      → El cuerpo reconoce la señal
 * 2) STABILIZATION  → La señal se vuelve consistente
 * 3) EXPANSION      → Se añaden estímulos adicionales
 */

export type Phase =
    | "detection"
    | "stabilization"
    | "expansion"
    | "completed";

export interface PhaseState {
    phase: Phase;
    day: number;
    adherence: number;        // % últimos 3 días (0-100)
    perceptionTrend: number;  // -1 peor | 0 igual | +1 mejor
    failures: number;
}

export function resolvePhase(state: PhaseState): Phase {

    // --- DETECTION PHASE ---
    // El cuerpo aún no reconoce la señal.
    if (state.phase === "detection") {

        // suficiente repetición → pasa a estabilización
        if (state.adherence >= 60 && state.day >= 3)
            return "stabilization";

        // demasiados fallos → se mantiene
        return "detection";
    }


    // --- STABILIZATION PHASE ---
    // El ritmo empieza a aparecer.
    if (state.phase === "stabilization") {

        // retroceso fisiológico → volver a detección
        if (state.failures >= 3)
            return "detection";

        // tendencia positiva → expansión
        if (state.perceptionTrend > 0 && state.adherence >= 70)
            return "expansion";

        return "stabilization";
    }


    // --- EXPANSION PHASE ---
    // Se pueden añadir estímulos.
    if (state.phase === "expansion") {

        // demasiada fricción → volver a estabilizar
        if (state.adherence < 50)
            return "stabilization";

        // final del protocolo
        if (state.day >= 14)
            return "completed";

        return "expansion";
    }

    return "completed";
}
