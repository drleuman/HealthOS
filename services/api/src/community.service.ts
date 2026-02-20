import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ClinicalInterpretationService } from './behavioral/clinical-interpretation.service';
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

@Injectable()
export class CommunityService {
    constructor(
        private prisma: PrismaService,
        private clinicalModeration: ClinicalInterpretationService
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

    async getThread(id: string) {
        return this.prisma.communityThread.findUnique({
            where: { id },
            include: {
                replies: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        user: {
                            select: { id: true, email: true } // Minimal user info
                        }
                    }
                }
            }
        });
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

    async getMembershipPostBySlug(slug: string) {
        const url = `${this.WP_URL}/posts?categories=${this.MEMBERSHIP_CAT}&slug=${slug}&_embed=1`;

        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            const posts = (await response.json()) as any[];
            if (!posts.length) return null;

            return this.mapWPPost(posts[0]);
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
