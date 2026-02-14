import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class KpiService {
    constructor(private prisma: PrismaService) { }

    /**
     * getCohortsWithGroup
     * Returns Map<userId, { cohortDate: Date, group: string }>
     */
    private async getCohortsWithGroup(startDate: Date, endDate: Date): Promise<Map<string, { cohortDate: Date, group: string }>> {
        const firstStarted = await this.prisma.event.groupBy({
            by: ['userId'],
            where: {
                event: 'day_started',
                userId: { not: null }
            },
            _min: {
                timestamp: true
            }
        });

        const userIds = firstStarted.map((f: any) => f.userId!);
        const userGroups = await this.prisma.userState.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, experimentGroup: true }
        });

        const groupMap = new Map(userGroups.map((g: any) => [g.userId, g.experimentGroup] as [string, string]));
        const cohortMap = new Map<string, { cohortDate: Date, group: string }>();

        firstStarted.forEach((f: any) => {
            if (f.userId && f._min.timestamp && f._min.timestamp >= startDate && f._min.timestamp <= endDate) {
                cohortMap.set(f.userId, {
                    cohortDate: f._min.timestamp,
                    group: (groupMap.get(f.userId as string) as string) || 'treatment'
                });
            }
        });
        return cohortMap;
    }

    /**
     * getCausalMetrics
     * Computes metrics split by Treatment vs Control
     */
    async getCausalMetrics(startDate: Date, endDate: Date) {
        const cohortMap = await this.getCohortsWithGroup(startDate, endDate);
        const userIds = Array.from(cohortMap.keys());

        if (userIds.length === 0) return null;

        const activations = await this.prisma.event.findMany({
            where: {
                userId: { in: userIds },
                event: 'day_completed',
                context: { path: '$.day', equals: 2 }
            },
            select: { userId: true, timestamp: true }
        });

        const stats = {
            treatment: { started: 0, activated: 0 },
            control: { started: 0, activated: 0 }
        };

        const activatedUserIds = new Set<string>();
        activations.forEach((a: any) => {
            const data = cohortMap.get(a.userId!);
            if (data && (a.timestamp.getTime() - data.cohortDate.getTime()) <= 48 * 60 * 60 * 1000) {
                activatedUserIds.add(a.userId!);
            }
        });

        for (const [userId, data] of cohortMap.entries()) {
            const g = data.group as 'treatment' | 'control';
            stats[g].started++;
            if (activatedUserIds.has(userId)) {
                stats[g].activated++;
            }
        }

        const treatmentRate = stats.treatment.started > 0 ? (stats.treatment.activated / stats.treatment.started * 100) : 0;
        const controlRate = stats.control.started > 0 ? (stats.control.activated / stats.control.started * 100) : 0;
        const uplift = treatmentRate - controlRate;

        return {
            treatment: { ...stats.treatment, rate: treatmentRate },
            control: { ...stats.control, rate: controlRate },
            uplift
        };
    }

    async getToolCTR(startDate: Date, endDate: Date) {
        const recommended = await this.prisma.event.count({
            where: {
                event: 'tool_recommended',
                timestamp: { gte: startDate, lte: endDate }
            }
        });

        const opened = await this.prisma.event.count({
            where: {
                event: 'tool_opened_store',
                timestamp: { gte: startDate, lte: endDate }
            }
        });

        const rate = recommended > 0 ? (opened / recommended) * 100 : 0;
        return { recommended, opened, rate };
    }

    async getInterventionExposure(startDate: Date, endDate: Date) {
        const activeUsersCount = (await this.prisma.event.groupBy({
            by: ['userId'],
            where: {
                timestamp: { gte: startDate, lte: endDate },
                userId: { not: null }
            }
        })).length;

        const exposedUsersCount = (await this.prisma.event.groupBy({
            by: ['userId'],
            where: {
                event: 'intervention_recommended',
                timestamp: { gte: startDate, lte: endDate }
            }
        })).length;

        const rate = activeUsersCount > 0 ? (exposedUsersCount / activeUsersCount) * 100 : 0;

        return { active: activeUsersCount, exposed: exposedUsersCount, rate };
    }

    async getTopDropoffStates(startDate: Date, endDate: Date) {
        const prismaAny = this.prisma as any;
        const states = await prismaAny.userBehaviorState.groupBy({
            by: ['state'],
            _count: { userId: true },
            where: { updatedAt: { gte: startDate, lte: endDate } },
            orderBy: { _count: { userId: 'desc' } },
            take: 3
        });

        return states.map((s: any) => ({ state: s.state, count: s._count.userId }));
    }
}
