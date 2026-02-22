import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SystemAlertsService } from '../system-alerts/system-alerts.service';

@Injectable()
export class ReactivationService {
    private readonly logger = new Logger(ReactivationService.name);

    constructor(
        private prisma: PrismaService,
        private systemAlerts: SystemAlertsService
    ) { }

    /**
     * Scan for users who haven't been active in 48h+ but have a protocol started.
     * This is a "Cold State" detection.
     */
    async scanForInactiveUsers() {
        const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

        const inactiveUsers = await (this.prisma.user as any).findMany({
            where: {
                lastSeen: { lte: threshold },
                status: 'active',
                // Only users who actually started something
                behaviorState: { isNot: null }
            },
            include: {
                behaviorState: true
            }
        });

        this.logger.log(`Scanning for inactive users... found ${inactiveUsers.length}`);

        for (const user of inactiveUsers) {
            await this.triggerReactivationHook(user);
        }

        return inactiveUsers.length;
    }

    private async triggerReactivationHook(user: any) {
        // 1. Check if we already triggered a hook recently (last 7 days)
        const recentHook = await (this.prisma as any).event.findFirst({
            where: {
                userId: user.id,
                event: 'reactivation_hook_triggered',
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        if (recentHook) return;

        // 2. Log reactivation event
        await (this.prisma as any).event.create({
            data: {
                event: 'reactivation_hook_triggered',
                userId: user.id,
                context: {
                    lastSeen: user.lastSeen,
                    programId: user.behaviorState?.programId,
                    dayIndex: user.behaviorState?.dayIndex
                }
            }
        });

        // 3. Trigger a system alert for operators (or email system in future)
        await this.systemAlerts.triggerAlert(
            'engagement_low',
            'warn',
            `User ${user.email} inactive for 48h+. Program: ${user.behaviorState?.programId}`
        );

        this.logger.warn(`Reactivation hook triggered for ${user.email}`);
    }

    /**
     * Detect "Magic Moments" - meaningful engagement events
     */
    async trackMagicMoment(userId: string, momentType: 'first_log' | 'protocol_completion' | 'streak_3') {
        const eventName = `magic_moment_${momentType}`;

        await (this.prisma as any).event.create({
            data: {
                event: eventName,
                userId,
                context: { timestamp: new Date() }
            }
        });

        this.logger.log(`Magic moment detected: ${momentType} for user ${userId}`);
    }
}
