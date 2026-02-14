
export class ExperimentGroupService {
    /**
     * getGroupForUser
     * Deterministically assigns a user to 'treatment' (80%) or 'control' (20%).
     * Uses a hash of the userId + optional context to ensure immutability and segment balance.
     */
    static getGroupForUser(userId: string, context: string = ""): 'treatment' | 'control' {
        const input = context ? `${userId}:${context}` : userId;

        // Create a simple numeric hash
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // Map hash to 0-99 range
        const score = Math.abs(hash) % 100;

        // 20% Control, 80% Treatment
        return score < 20 ? 'control' : 'treatment';
    }
}
