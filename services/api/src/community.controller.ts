import { Controller, Get, Post, Body, Param, Query, Headers, UnauthorizedException, UseGuards, HttpException, HttpStatus, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CommunityService } from './community.service';
import { JwtService } from '@nestjs/jwt';
import { Public, RequiredPlan } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SubscriptionGuard } from './subscription.guard';

@Controller('community')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class CommunityController {
    constructor(
        private service: CommunityService,
        private jwtService: JwtService
    ) { }

    @RequiredPlan('free')
    @Throttle({ default: { limit: 120, ttl: 60000 } })
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

    @Throttle({ default: { limit: 60, ttl: 60000 } })
    @Get('thread/:id')
    async getThread(@Param('id') id: string, @Req() req: any) {
        return this.service.getThread(id, req.user.plan, req.user.id);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('thread/:id/reply')
    async createReply(
        @Param('id') id: string,
        @Body('content') content: string,
        @Req() req: any
    ) {
        // userId from JwtAuthGuard
        return this.service.createReply(id, req.user.id, content);
    }

    @RequiredPlan('free')
    @Get('membership')
    async getMembershipPosts(
        @Query('page') page?: string,
        @Query('perPage') perPage?: string
    ) {
        return this.service.getMembershipPosts(
            page ? parseInt(page, 10) : 1,
            perPage ? parseInt(perPage, 10) : 10
        );
    }

    @RequiredPlan('free')
    @Get('membership/:slug')
    async getMembershipPost(@Param('slug') slug: string, @Req() req: any) {
        const post = await this.service.getMembershipPostBySlug(slug, req.user.plan);
        if (!post) {
            throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
        }
        return post;
    }
}
