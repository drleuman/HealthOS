import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ClinicalInterpretationService } from './behavioral/clinical-interpretation.service';

export interface ThreadFilter {
    scope?: string;
    protocolId?: string;
    day?: number;
    areaId?: string;
    limit?: number;
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
}
