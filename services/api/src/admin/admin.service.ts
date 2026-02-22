import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TrackingService } from '../tracking.service';
import { Prisma } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';
import { BaselineService } from '../metrics/baseline.service';
import { GrowthIntelligenceService } from '../analytics/growth-intelligence.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);
    private overviewCache: Record<string, { data: any; timestamp: number }> = {};
    private readonly CACHE_TTL = 30000; // 30 seconds

    constructor(
        private prisma: PrismaService,
        private tracking: TrackingService,
        private metrics: MetricsService,
        private baseline: BaselineService,
        private growth: GrowthIntelligenceService
    ) { }

    async getOverview(periodDays: number = 7) {
        const cacheKey = `overview_${periodDays}`;
        const cached = this.overviewCache[cacheKey];
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.data;
        }

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - periodDays);

        const [totalUsers, activeUsers, newUsers, paywallImpressions, paywallClicks, conversions, eventsLast60Min, recentErrors] = await Promise.all([
            this.prisma.user.count(),
            (this.prisma.user as any).count({ where: { lastSeen: { gte: dateLimit } } }),
            this.prisma.user.count({ where: { createdAt: { gte: dateLimit } } }),
            this.prisma.event.count({ where: { event: 'paywall_impression', timestamp: { gte: dateLimit } } }),
            this.prisma.event.count({ where: { event: 'paywall_cta_clicked', timestamp: { gte: dateLimit } } }),
            this.prisma.event.count({ where: { event: 'conversion_completed', timestamp: { gte: dateLimit } } }),
            this.prisma.event.count({
                where: {
                    timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }
                }
            }),
            this.prisma.event.count({
                where: {
                    event: { in: ['api_error', 'system_error'] },
                    timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            })
        ]);

        const data = {
            totalUsers,
            activeUsers,
            newUsers,
            funnel: {
                impressions: paywallImpressions,
                clicks: paywallClicks,
                conversions: conversions
            },
            eventsLast60Min,
            recentErrors
        };

        this.overviewCache[cacheKey] = { data, timestamp: Date.now() };
        return data;
    }

    async getUsers(query: string, plan: string, status: string, page: number = 1, limit: number = 20) {
        const whereClause: any = {};

        if (query) {
            whereClause.OR = [
                { email: { contains: query } },
                { id: { equals: query } }
            ];
        }
        if (plan) whereClause.plan = plan;
        if (status) whereClause.status = status;

        const [users, total] = await Promise.all([
            (this.prisma.user as any).findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    plan: true,
                    role: true,
                    status: true,
                    lastSeen: true,
                    createdAt: true
                }
            } as any),
            this.prisma.user.count({ where: whereClause })
        ]);

        return {
            users,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getUserDetails(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                refreshTokens: {
                    select: {
                        id: true,
                        sessionId: true,
                        ip: true,
                        userAgent: true,
                        createdAt: true,
                        rotatedAt: true
                    }
                }
            }
        });

        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateUser(adminId: string, targetUserId: string, updateData: { plan?: string; role?: string; status?: string; metadata?: any }) {
        const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) throw new NotFoundException('User not found');

        if (adminId === targetUser.id && updateData.status === 'blocked') {
            throw new BadRequestException('Cannot block yourself');
        }

        const data: any = {};
        if (updateData.plan !== undefined) data.plan = updateData.plan;
        if (updateData.role !== undefined) data.role = updateData.role;
        if (updateData.status !== undefined) data.status = updateData.status;

        if (updateData.metadata !== undefined) {
            if (JSON.stringify(updateData.metadata).length > 5000) {
                throw new BadRequestException('Metadata too large');
            }
            data.metadata = updateData.metadata;
        }

        const updated = await this.prisma.user.update({
            where: { id: targetUserId },
            data,
            select: { id: true, plan: true, role: true, status: true, metadata: true, email: true }
        });

        // Auditing
        if (updateData.status && updateData.status !== targetUser.status) {
            this.tracking.track({
                event: updateData.status === 'blocked' ? 'admin_user_blocked' : 'admin_user_unblocked',
                userId: adminId,
                context: { targetUserId, email: targetUser.email, reason: 'admin_action' }
            });
            this.logger.warn(`[ADMIN] ${adminId} changed status of ${targetUser.id} to ${updateData.status}`);
        }
        if (updateData.plan && updateData.plan !== targetUser.plan) {
            this.tracking.track({
                event: 'admin_plan_changed',
                userId: adminId,
                context: { targetUserId, oldPlan: targetUser.plan, newPlan: updateData.plan }
            });
            this.logger.warn(`[ADMIN] ${adminId} changed plan of ${targetUser.id} to ${updateData.plan}`);
        }
        if (updateData.role && updateData.role !== 'user') { // Note: old role isn't typed properly yet.
            this.tracking.track({
                event: 'admin_role_changed',
                userId: adminId,
                context: { targetUserId, newRole: updateData.role }
            });
            this.logger.warn(`[ADMIN] ${adminId} changed role of ${targetUser.id} to ${updateData.role}`);
        }
        if (updateData.metadata) {
            this.tracking.track({
                event: 'admin_metadata_updated',
                userId: adminId,
                context: { targetUserId }
            });
            this.logger.warn(`[ADMIN] ${adminId} updated metadata of ${targetUser.id}`);
        }

        return updated;
    }

    async revokeSessions(adminId: string, targetUserId: string, sessionId?: string) {
        if (sessionId) {
            await this.prisma.refreshToken.deleteMany({
                where: { userId: targetUserId, sessionId }
            });
        } else {
            await this.prisma.refreshToken.deleteMany({
                where: { userId: targetUserId }
            });
        }

        this.tracking.track({
            event: 'admin_sessions_revoked',
            userId: adminId,
            context: { targetUserId, sessionId: sessionId || 'all' }
        });
        this.logger.warn(`[ADMIN] ${adminId} revoked sessions for ${targetUserId} (sessionId: ${sessionId || 'all'})`);

        return { success: true };
    }

    async getUserActivityTimeline(userId: string) {
        return this.prisma.event.findMany({
            where: { userId },
            take: 20,
            orderBy: { timestamp: 'desc' },
            select: {
                id: true,
                event: true,
                timestamp: true,
                context: true
            }
        });
    }

    async getEvents(event?: string, feature?: string, userId?: string, periodDays: number = 7, limit: number = 200) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - periodDays);

        const whereClause: Prisma.EventWhereInput = {
            timestamp: { gte: dateLimit }
        };

        if (event) whereClause.event = event;
        if (userId) whereClause.userId = userId;

        const events = await this.prisma.event.findMany({
            where: whereClause,
            take: limit,
            orderBy: { timestamp: 'desc' }
        });

        // Basic filtering for feature inside context JSON if needed
        // Assuming context contains "feature" key
        if (feature) {
            return events.filter(e => {
                const ctx = e.context as any;
                return ctx && ctx.feature === feature;
            });
        }

        return events;
    }

    async getSystemHealth() {
        const metrics = await this.metrics.getSystemHealthMetrics();
        return {
            ...metrics,
            timestamp: new Date(),
            version: process.env.npm_package_version || '1.0.0',
            nodeEnv: process.env.NODE_ENV || 'development'
        };
    }

    async getInsights(periodDays: number = 7) {
        const [growthInsights, anomalies, baselines] = await Promise.all([
            this.growth.getConversionInsights(periodDays),
            (this.prisma as any).incident.findMany({
                where: {
                    createdAt: { gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            Promise.resolve(this.baseline.getAllBaselines())
        ]);

        return {
            growth: growthInsights,
            anomalies,
            baselines
        };
    }
}
