
export interface ProductDecision {
    problem: string;
    hypothesis: string;
    action: string;
    expected_effect: string;
    confidence: "low" | "medium" | "high";
    insufficient_evidence?: boolean;
    verdict?: "KEEP" | "ROLLBACK" | "CONTINUE" | "INVESTIGATE";
}

export class DecisionEngine {
    /**
     * evaluateUplift
     * Enforces experimental discipline based on Treatment vs Control delta.
     * Hardened for causal validity.
     */
    static evaluateUplift(causalMetrics: any, contaminationFound: boolean = false): "KEEP" | "ROLLBACK" | "CONTINUE" | "INVESTIGATE" {
        if (contaminationFound) return "INVESTIGATE";

        const uplift = causalMetrics.uplift;
        const MIN_SAMPLE_PER_GROUP = 15;

        // Hard rule: Confidence requires 15 users in BOTH groups
        if (causalMetrics.treatment.started < MIN_SAMPLE_PER_GROUP || causalMetrics.control.started < MIN_SAMPLE_PER_GROUP) {
            return "CONTINUE";
        }

        if (uplift > 10) return "KEEP";
        if (uplift < -5) return "ROLLBACK";

        return "CONTINUE";
    }

    /**
     * run
     * Analyzes KPIs and top states to recommend ONE product change.
     */
    static run(kpis: any, topStates: any[]): ProductDecision {
        // PHASE 4: Hard Freeze Flag
        if (process.env.BETA_FREEZE === 'true') {
            return {
                problem: "PRODUCT FREEZE ACTIVE",
                hypothesis: "Beta observation window is locked.",
                action: "CONTINUE EXPERIMENT",
                expected_effect: "N/A",
                confidence: "low",
                insufficient_evidence: true
            };
        }

        const MIN_SAMPLE_PER_GROUP = 15;

        // Aggregate check for initial recommendation
        const treatmentStarted = kpis.activation.treatment_started || kpis.activation.started || 0;
        const controlStarted = kpis.activation.control_started || 0;

        // For initial recommendation (before experiment), we look at aggregate
        if (treatmentStarted < MIN_SAMPLE_PER_GROUP) {
            return {
                problem: "INSUFFICIENT EVIDENCE",
                hypothesis: `Aggregate sample size (${treatmentStarted}/${MIN_SAMPLE_PER_GROUP}) too small for reliable baseline.`,
                action: "CONTINUE EXPERIMENT",
                expected_effect: "N/A",
                confidence: "low",
                insufficient_evidence: true
            };
        }

        // Priority 1: Activation Issues
        if (kpis.activation.rate < 60) {
            return {
                problem: "Low Day 1 to Day 2 activation.",
                hypothesis: "The onboarding steps or the first day's instruction are unclear or too demanding.",
                action: "Simplify Day 1 instructions and add a checklist to the onboarding flow.",
                expected_effect: "Increase D1->D2 activation rate by 15%.",
                confidence: "medium"
            };
        }

        // Priority 2: Early Dropoff / Instruction Unclear
        const hasInstructionUnclear = topStates.some(s => s.state === 'instruction_unclear' && s.count > 0);
        if (hasInstructionUnclear) {
            return {
                problem: "Frequent 'instruction_unclear' state detected.",
                hypothesis: "Users are repeatedly opening the same day task without completing it, suggesting technical friction or confusing UI.",
                action: "Replace text-only instructions with a short 30-second video demo for the most replayed days.",
                expected_effect: "Reduce repeat opens without completion by 20%.",
                confidence: "medium"
            };
        }

        // Default: Optimization
        return {
            problem: "Overall steady progress but room for optimization.",
            hypothesis: "Minor friction points are still present even for active users.",
            action: "Add subtle micro-animations to the 'Complete' button to increase reward sensation.",
            expected_effect: "Slight increase in daily completion logs.",
            confidence: "low"
        };
    }
}
