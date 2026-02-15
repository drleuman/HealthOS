/**
 * HEALTHOS — DAY PROGRESSION ENGINE
 * 
 * Decides daily tactical movement:
 * - advance: standard progression
 * - repeat: reinforcement needed
 * - simplify: friction reduction needed
 */

export type ProgressDecision =
    | "advance"
    | "repeat"
    | "simplify";

export function decideProgress(
    adherence: number,  // 0-100
    failures: number,
    perception?: "better" | "same" | "worse"
): ProgressDecision {

    // muchos fallos → simplificar
    if (failures >= 2)
        return "simplify";

    // percepción negativa → repetir
    if (perception === "worse")
        return "repeat";

    // baja adherencia → repetir
    if (adherence < 50)
        return "repeat";

    // correcto → avanzar
    return "advance";
}
