import { Controller, Get, Post, Body, Param, Query, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtService } from '@nestjs/jwt';
import { Public } from './public.decorator';

@Controller('community')
export class CommunityController {
    constructor(
        private service: CommunityService,
        private jwtService: JwtService
    ) { }

    @Public()
    @Get('threads')
    async getThreads(
        @Query('scope') scope?: string,
        @Query('protocolId') protocolId?: string,
        @Query('day') day?: string,
        @Query('areaId') areaId?: string,
        @Query('limit') limit?: string
    ) {
        return this.service.getThreads({
            scope,
            protocolId,
            day: day ? parseInt(day, 10) : undefined,
            areaId,
            limit: limit ? parseInt(limit, 10) : undefined
        });
    }

    @Public()
    @Get('thread/:id')
    async getThread(
        @Param('id') id: string,
        @Headers('authorization') authHeader?: string
    ) {
        // Soft gating: Check if user is authenticated
        let userId: string | null = null;
        try {
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const payload = await this.jwtService.verifyAsync(token, {
                    secret: process.env.API_JWT_SECRET
                });
                userId = payload.sub;
            }
        } catch (e) {
            // Token invalid or expired - treat as unauthenticated
            userId = null;
        }

        // If not authenticated, return gated response
        if (!userId) {
            return {
                gated: true,
                threadId: id,
                message: 'Authentication required to view this thread'
            };
        }

        // Authenticated: return full thread
        return this.service.getThread(id);
    }

    @Post('thread/:id/reply')
    async createReply(
        @Param('id') id: string,
        @Body('content') content: string,
        @Headers('authorization') authHeader: string
    ) {
        const userId = await this.getUserId(authHeader);
        return this.service.createReply(id, userId, content);
    }

    private async getUserId(authHeader: string): Promise<string> {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing token');
        }
        const token = authHeader.split(' ')[1];
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.API_JWT_SECRET
            });
            return payload.sub;
        } catch (e) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
