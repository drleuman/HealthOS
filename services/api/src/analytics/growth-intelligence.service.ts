import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GrowthIntelligenceService {
    private readonly logger = new Logger(GrowthIntelligenceService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Calculate conversion attribution by feature
     * Analyzes which features were used before a conversion_completed event
     */
    async getConversionInsights(periodDays: number = 7) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - periodDays);

        try {
            // 1. Get all conversion events (conversion_completed)
            const conversions = await this.prisma.event.findMany({
                where: {
                    event: 'conversion_completed',
                    timestamp: { gte: dateLimit }
                },
                select: {
                    userId: true,
                    timestamp: true
                }
            });

            if (conversions.length === 0) return { total: 0, byFeature: {} };

            const featureAttribution: Record<string, number> = {};

            // 2. For each conversion, find preceding events for that user
            for (const conv of conversions) {
                if (!conv.userId) continue;

                // Find events in the 24h preceding conversion
                const dayBefore = new Date(conv.timestamp.getTime() - 24 * 60 * 60 * 1000);

                const precedingEvents = await this.prisma.event.findMany({
                    where: {
                        userId: conv.userId,
                        timestamp: {
                            gte: dayBefore,
                            lt: conv.timestamp
                        },
                        event: {
                            in: ['day_viewed', 'tool_recommended', 'help_opened', 'community_thread_viewed']
                        }
                    },
                    select: {
                        event: true,
                        context: true
                    }
                });

                // Attribute to specific features
                const seenFeatures = new Set<string>();
                for (const e of precedingEvents) {
                    let featureName = e.event;

                    // Extract deeper feature name from context if available
                    const context = e.context as any;
                    if (context?.feature) featureName = context.feature;
                    else if (context?.program) featureName = `program_${context.program}`;
                    else if (context?.day) featureName = `day_${context.day}`;

                    seenFeatures.add(featureName);
                }

                for (const f of seenFeatures) {
                    featureAttribution[f] = (featureAttribution[f] || 0) + 1;
                }
            }

            // Normalize to percentages
            const total = conversions.length;
            const normalized = Object.entries(featureAttribution).map(([feature, count]) => ({
                feature,
                count,
                rate: (count / total) * 100
            })).sort((a, b) => b.count - a.count);

            return {
                total,
                insights: normalized
            };

        } catch (e: any) {
            this.logger.error(`Failed to get conversion insights: ${e.message}`);
            return { error: e.message };
        }
    }
}
