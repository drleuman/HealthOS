import type { OnboardingData } from './onboarding.types';

/**
 * Builds the assessment payload from the onboarding form state.
 * - Always includes primary_goal and chronometry fields.
 * - Only includes array fields when they have at least one entry.
 * - Strips undefined values so the request body stays minimal.
 * - Compatible with api.submitAssessment() which accepts any shape.
 */
export function buildAssessmentPayload(
    data: OnboardingData,
): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        primary_goal: data.primary_goal,
        bedtime: data.bedtime,
        caffeine_time: data.caffeine_time,
        dinner_time: data.dinner_time,
    };

    const arrayFields: (keyof OnboardingData)[] = [
        'sleep_issue_type',
        'energy_patterns',
        'digestion_patterns',
        'body_goal_type',
        'stress_pattern',
        'performance_focus',
        'symptoms',
        'constraints',
    ];

    for (const key of arrayFields) {
        const value = data[key];
        if (Array.isArray(value) && value.length > 0) {
            payload[key] = value;
        }
    }

    return payload;
}
