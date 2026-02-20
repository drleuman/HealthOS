import { Injectable } from '@nestjs/common';

export type PlanLevel = 'free' | 'member' | 'premium' | 'admin';

export interface PlanPolicy {
    historyDays: number;
    dailyLogMaxTotal: number;
    threadReads24h: number;
    routePhaseMax: number;
    canReply: boolean;
    fullArticleAccess: boolean;
}

@Injectable()
export class PlanService {
    private readonly POLICIES: Record<PlanLevel, PlanPolicy> = {
        free: {
            historyDays: 3,
            dailyLogMaxTotal: 7,
            threadReads24h: 3,
            routePhaseMax: 1,
            canReply: false,
            fullArticleAccess: false,
        },
        member: {
            historyDays: 9999,
            dailyLogMaxTotal: 9999,
            threadReads24h: 9999,
            routePhaseMax: 9999,
            canReply: true,
            fullArticleAccess: true,
        },
        premium: {
            historyDays: 9999,
            dailyLogMaxTotal: 9999,
            threadReads24h: 9999,
            routePhaseMax: 9999,
            canReply: true,
            fullArticleAccess: true,
        },
        admin: {
            historyDays: 9999,
            dailyLogMaxTotal: 9999,
            threadReads24h: 9999,
            routePhaseMax: 9999,
            canReply: true,
            fullArticleAccess: true,
        },
    };

    getPolicy(plan: string): PlanPolicy {
        return this.POLICIES[plan as PlanLevel] || this.POLICIES.free;
    }

    /**
     * Helper to wrap data in a gated envelope
     */
    buildEnvelope<T>(data: T, userPlan: string, feature: string, isGated: boolean) {
        if (!isGated) return { data };

        const policy = this.getPolicy(userPlan);
        return {
            data,
            meta: {
                gated: true,
                reason: 'UPGRADE_REQUIRED',
                feature,
                message_key: `App.Paywall.${feature}`,
                cta_link: '/plans',
            }
        };
    }
}
