import { Injectable } from '@nestjs/common';

export type ProtocolAction = {
    id: string;
    label: string;
    minMinutes?: number;
    rules?: string[];
};

export type ProtocolCheck = {
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
};

export type ProtocolResource = {
    slug?: string;
    threadId?: string;
    titleKey: string;
    whyKey: string;
    type: 'blog' | 'recipe' | 'product' | 'course' | 'community';
    tags?: string[];
    minPlan: { showInL1: boolean; showInL2: boolean };
    gating?: { minDay?: number; requires?: Array<{ type: string; value: number }> };
};

export type ProtocolDayContent = {
    day: number;
    title: string;
    learn: any;
    do: { actions: ProtocolAction[] };
    check: ProtocolCheck;
    support: any;
    resources?: ProtocolResource[];
};

@Injectable()
export class ProtocolContentService {

    getTodayProtocolContent(
        protocolId: string,
        day: number,
        minimal?: { enabled: boolean; level: 0 | 1 | 2 },
        userContext?: { completedDays: number; frictionScore?: number }
    ): ProtocolDayContent | null {
        let protocol;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            protocol = require(`./protocols/${protocolId}.json`);
        } catch (e) {
            return null;
        }

        const protocolDay = protocol.days.find((d: any) => d.day === day);
        if (!protocolDay) return null;

        const content: ProtocolDayContent = {
            day: protocolDay.day,
            title: protocolDay.title,
            learn: protocolDay.learn,
            do: protocolDay.do,
            check: protocolDay.check,
            support: protocolDay.support,
            resources: []
        };

        // Load mapping if available
        let mapping;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            mapping = require(`./mappings/${protocolId}.mapping.json`);
        } catch (e) {
            // No mapping, no resources
        }

        if (mapping) {
            const dayMapping = mapping.days.find((d: any) => d.day === day);
            if (dayMapping && dayMapping.resources) {
                const allResources: ProtocolResource[] = [];
                const res = dayMapping.resources;

                // Flatten and tag by type
                const types = ['blog', 'recipes', 'products', 'courses', 'community'];
                types.forEach(t => {
                    const list = res[t] || [];
                    list.forEach((item: any) => {
                        allResources.push({
                            ...item,
                            type: t === 'recipes' ? 'recipe' : (t === 'products' ? 'product' : (t === 'courses' ? 'course' : t as any))
                        });
                    });
                });

                // Filter
                let filtered = allResources.filter(r =>
                    this.shouldShowByMinimalMode(minimal?.level || 0, r) &&
                    this.passesGating(userContext || { completedDays: day - 1 }, day, r)
                );

                // Limit products to 1 max
                const products = filtered.filter(r => r.type === 'product');
                const others = filtered.filter(r => r.type !== 'product' && r.type !== 'community');
                const limitedProducts = products.length > 0 ? [products[0]] : [];

                // Limit community by minimal level
                const comms = filtered.filter(r => r.type === 'community');
                let limitComm = 6;
                if (minimal?.level === 2) limitComm = 1;
                else if (minimal?.level === 1) limitComm = 3;
                const limitedComms = comms.slice(0, limitComm);

                filtered = [...others, ...limitedProducts, ...limitedComms];

                // Stable Sort: community > blog > recipe > course > product
                const typeWeight: Record<string, number> = {
                    community: 1,
                    blog: 2,
                    recipe: 3,
                    course: 4,
                    product: 5
                };

                content.resources = filtered.sort((a, b) =>
                    (typeWeight[a.type] || 99) - (typeWeight[b.type] || 99)
                );
            }
        }

        return this.applyMinimalMode(content, minimal);
    }

    private shouldShowByMinimalMode(level: number, item: ProtocolResource): boolean {
        if (level === 2) return item.minPlan?.showInL2 ?? false;
        if (level === 1) return item.minPlan?.showInL1 ?? false;
        return true;
    }

    private passesGating(user: { completedDays: number; frictionScore?: number }, day: number, item: ProtocolResource): boolean {
        // Rule: products only show if friction is high (>= 0.3)
        if (item.type === 'product') {
            const friction = user.frictionScore ?? 0;
            if (friction < 0.3) return false;
        }

        if (!item.gating) return true;
        if (item.gating.minDay && day < item.gating.minDay) return false;
        for (const req of item.gating.requires || []) {
            if (req.type === 'completed_days_gte' && user.completedDays < req.value) return false;
            if (req.type === 'friction_score_gte' && (user.frictionScore || 0) < req.value) return false;
        }
        return true;
    }

    private applyMinimalMode(
        content: ProtocolDayContent,
        minimal?: { enabled: boolean; level: 0 | 1 | 2 }
    ): ProtocolDayContent {
        if (!minimal?.enabled || minimal.level === 0) return content;

        const actions = content.do?.actions || [];
        const minimalActions = actions.length > 0 ? [actions[0]] : [];
        const minimalCheck = minimal.level === 2 ? null : content.check;

        return {
            ...content,
            do: { actions: minimalActions },
            check: minimalCheck as any
        };
    }

    getProtocolMeta(protocolId: string) {
        let protocol;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            protocol = require(`./protocols/${protocolId}.json`);
        } catch (e) {
            return { id: protocolId, durationDays: 14, version: '1.0.0' }; // Fallback
        }

        return {
            id: protocolId,
            durationDays: protocol.duration_days || protocol.days?.length || 14,
            version: protocol.version || '1.0.0'
        };
    }
}

