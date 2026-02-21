import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';

export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRED_PLAN_KEY = 'requiredPlan';

/**
 * Guard that checks if user has an active subscription
 * Simple version: checks if user.plan !== 'free'
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if endpoint is public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // If no user (shouldn't happen after JWT guard), deny
        if (!user || !user.email) {
            throw new ForbiddenException('User not authenticated');
        }

        // Get required plan for this endpoint (default: 'member')
        const requiredPlan = this.reflector.getAllAndOverride<string>(REQUIRED_PLAN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]) || 'member';

        let dbUser;
        try {
            // Fetch user from database to get current plan and role
            dbUser = await this.prisma.user.findUnique({
                where: { email: user.email },
                select: { plan: true, role: true },
            });
        } catch (e) {
            console.error('SubscriptionGuard DB Error:', e);
            // Fallback to minimal plan to allow app to load in Limited Mode
            dbUser = { plan: 'member', role: 'user' };
        }

        if (!dbUser) {
            throw new ForbiddenException('User not found');
        }

        // Explicit Role Check: If an endpoint demands 'admin', 
        // they must have the 'admin' role, regardless of their billing plan.
        if (requiredPlan === 'admin' && dbUser.role !== 'admin') {
            throw new ForbiddenException('Admin access required');
        }

        // Simple plan hierarchy: free < member < premium
        const planHierarchy: Record<string, number> = {
            free: 0,
            member: 1,
            premium: 2,
            admin: 100, // Kept for backwards compatibility but role is the true check
        };

        const userPlanLevel = planHierarchy[dbUser.plan] ?? 0;
        const requiredPlanLevel = planHierarchy[requiredPlan] ?? 1;

        if (userPlanLevel < requiredPlanLevel) {
            throw new ForbiddenException(
                `Active ${requiredPlan} subscription required. Current plan: ${dbUser.plan}`,
            );
        }

        return true;
    }
}
