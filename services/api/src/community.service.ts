import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ClinicalInterpretationService } from './behavioral/clinical-interpretation.service';
import { ExperimentService } from './analytics/experiment.service';
import fetch from 'node-fetch';

export interface ThreadFilter {
    scope?: string;
    protocolId?: string;
    day?: number;
    areaId?: string;
    limit?: number;
}

export interface WordPressPost {
    id: number;
    date: string;
    slug: string;
    link: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    featured_media_url?: string;
}

import { PlanService } from './plan.service';
import { TrackingService } from './tracking.service';

@Injectable()
export class CommunityService {
    constructor(
        private prisma: PrismaService,
        private clinicalModeration: ClinicalInterpretationService,
        private planService: PlanService,
        private tracking: TrackingService,
        private experimentService: ExperimentService
    ) { }

    async getThreads(filter: ThreadFilter) {
        const where: any = {};
        if (filter.scope) where.scope = filter.scope;
        if (filter.protocolId) where.protocolId = filter.protocolId;
        if (filter.day) where.day = filter.day;
        if (filter.areaId) where.areaId = filter.areaId;

        return this.prisma.communityThread.findMany({
            where,
            orderBy: { lastActivityAt: 'desc' },
            take: filter.limit || 20,
            include: {
                _count: {
                    select: { replies: true }
                }
            }
        });
    }

    async getThread(id: string, userPlan: string, userId: string) {
        const policy = this.planService.getPolicy(userPlan);

        if (userPlan === 'free') {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const readCount = await this.prisma.event.count({
                where: {
                    userId,
                    event: 'thread_read',
                    timestamp: { gte: last24h }
                }
            });

            // Dynamic limit based on A/B test 'community_limit'
            const variant = await this.experimentService.getVariant(userId, 'community_limit');
            let dynamicLimit = policy.threadReads24h; // Fallback to policy (usually 3)

            switch (variant) {
                case 'v5': dynamicLimit = 5; break;
                case 'v10': dynamicLimit = 10; break;
                case 'control':
                default: dynamicLimit = 3; break;
            }

            if (readCount >= dynamicLimit) {
                this.tracking.trackPlanGated(userId, userPlan, 'thread_reads_24h', true).catch(() => { });
                const thread = await this.prisma.communityThread.findUnique({
                    where: { id },
                    include: {
                        replies: { take: 1, orderBy: { createdAt: 'asc' } }
                    }
                });

                return this.planService.buildEnvelope({
                    ...thread,
                    replies: thread?.replies.map(r => ({ ...r, content: r.content.substring(0, 100) + '...' }))
                }, userPlan, 'thread_reads_24h', true);
            }

            // Record read if not already recorded
            const alreadyRead = await this.prisma.event.findFirst({
                where: {
                    userId,
                    event: 'thread_read',
                    timestamp: { gte: last24h },
                    context: { path: ['threadId'], equals: id } as any // Prisma JSON query bypass
                }
            });

            if (!alreadyRead) {
                await this.prisma.event.create({
                    data: { userId, event: 'thread_read', context: { threadId: id } }
                });
                this.tracking.trackQuotaConsumed(userId, 'thread_reads_24h', policy.threadReads24h - (readCount + 1)).catch(() => { });
            }
        }

        const data = await this.prisma.communityThread.findUnique({
            where: { id },
            include: {
                replies: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        user: {
                            select: { id: true, email: true }
                        }
                    }
                }
            }
        });

        return this.planService.buildEnvelope(data, userPlan, 'thread_reads_24h', false);
    }

    async createReply(threadId: string, userId: string, content: string) {
        // 1. Moderate clinical context
        const mod = this.clinicalModeration.interpret(content);

        if (mod.action === 'ESCALATE' || mod.action === 'HOLD') {
            throw new HttpException({
                message: 'Moderation block',
                flag: mod.flag,
                action: mod.action
            }, HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // 2. Persist
        const reply = await this.prisma.communityReply.create({
            data: {
                threadId,
                userId,
                content,
                moderationFlag: mod.flag,
                moderationAction: mod.action,
                overlayKey: mod.overlayKey
            }
        });

        // 3. Update last activity
        await this.prisma.communityThread.update({
            where: { id: threadId },
            data: { lastActivityAt: new Date() }
        });

        return reply;
    }

    /**
     * Seed initial threads for a protocol day if they don't exist.
     * Use sparingly to avoid friction.
     */
    async ensureProtocolThread(protocolId: string, day: number, title: string) {
        const existing = await this.prisma.communityThread.findFirst({
            where: { protocolId, day, scope: 'program_day' }
        });

        if (existing) return existing;

        return this.prisma.communityThread.create({
            data: {
                title,
                scope: 'program_day',
                protocolId,
                day,
                excerpt: `Espacio de apoyo para el día ${day} del protocolo ${protocolId}.`
            }
        });
    }

    /**
     * WordPress Membership Content
     */
    private WP_URL = 'https://comunidaddescentra.com/wp-json/wp/v2';
    private MEMBERSHIP_CAT = 65;

    async getMembershipPosts(page = 1, perPage = 10) {
        const url = `${this.WP_URL}/posts?categories=${this.MEMBERSHIP_CAT}&per_page=${perPage}&page=${page}&_embed=1&orderby=date&order=desc`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`WP API error: ${response.status}`);

            const total = response.headers.get('X-WP-Total');
            const totalPages = response.headers.get('X-WP-TotalPages');
            const posts = (await response.json()) as any[];

            return {
                posts: posts.map((p: any) => this.mapWPPost(p)),
                pagination: {
                    total: total ? parseInt(total, 10) : 0,
                    totalPages: totalPages ? parseInt(totalPages, 10) : 0,
                    currentPage: page,
                    perPage
                }
            };
        } catch (error) {
            console.error('Failed to fetch WP posts', error);
            return { posts: [], pagination: { total: 0, totalPages: 0, currentPage: page, perPage } };
        }
    }

    async getMembershipPostBySlug(slug: string, userPlan: string) {
        const url = `${this.WP_URL}/posts?categories=${this.MEMBERSHIP_CAT}&slug=${slug}&_embed=1`;

        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            const posts = (await response.json()) as any[];
            if (!posts.length) return null;

            const post = this.mapWPPost(posts[0]);
            const policy = this.planService.getPolicy(userPlan);

            if (!policy.fullArticleAccess) {
                this.tracking.trackPlanGated(post.id.toString(), userPlan, 'full_article_access', false).catch(() => { }); // Post ID as identifier
                return this.planService.buildEnvelope({
                    ...post,
                    content: { rendered: post.excerpt.rendered + "<p><i>[Contenido exclusivo para miembros]</i></p>" }
                }, userPlan, 'full_article_access', true);
            }

            return this.planService.buildEnvelope(post, userPlan, 'full_article_access', false);
        } catch (error) {
            console.error('Failed to fetch WP post by slug', error);
            return null;
        }
    }

    private mapWPPost(p: any): WordPressPost {
        return {
            id: p.id,
            date: p.date,
            slug: p.slug,
            link: p.link,
            title: p.title,
            excerpt: p.excerpt,
            content: p.content,
            featured_media_url: p._embedded?.['wp:featuredmedia']?.[0]?.source_url
        };
    }
}
