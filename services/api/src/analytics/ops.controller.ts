import { Controller, Get, Headers, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Public } from '../public.decorator';

@Controller('internal/ops')
export class OpsController {
    constructor(private prisma: PrismaService) { }

    @Public()
    @Get('state')
    async getOpsState(@Headers('x-analytics-secret') secret: string) {
        const validSecret = process.env.ANALYTICS_SECRET || 'admin-secret-dev';

        if (!secret || secret !== validSecret) {
            throw new UnauthorizedException('Invalid Analytics Secret');
        }

        try {
            // Get the latest daily digest job result
            const latestDigest = await this.prisma.jobResult.findFirst({
                where: {
                    jobType: 'daily_digest',
                    status: 'success'
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (!latestDigest || !latestDigest.data) {
                return {
                    status: 'COLLECTING',
                    trustLevel: 'UNUSABLE',
                    action: 'WAIT',
                    nextCheck: 'Pending first run',
                    reason: 'NO_DATA',
                    validSample: 0,
                    effectiveN: 0,
                    candidatesN: 0,
                    biasRatio: 0,
                    contaminationCount: 0,
                    activeUsers24h: 0,
                    lastDigestAt: null
                };
            }

            const data = latestDigest.data as any;


            const trustLevel = data.trustLevel;
            let operatorMode = 'LOCKED';
            if (trustLevel === 'USABLE') operatorMode = 'INTERPRET';
            else if (trustLevel === 'LIMITED') operatorMode = 'OBSERVE';
            else operatorMode = 'LOCKED';

            // Map to the requested simplified structure
            return {
                status: data.trustLevel === 'UNUSABLE' ? 'COLLECTING' : 'STABLE', // Or derive from signalStatus if available
                trustLevel: data.trustLevel,
                operatorMode,
                action: data.action,
                nextCheck: data.nextCheck,
                reason: data.primaryCause,
                validSample: data.validSampleN,
                effectiveN: data.effectiveN,
                candidatesN: data.candidatesN,
                biasRatio: data.biasRatio,
                contamination: data.contaminationCount || 0, // Ensure field name matches user request 'contamination'
                activeUsers24h: data.activeUsers24h || 0,
                lastDigestAt: latestDigest.createdAt.toISOString()
            };

        } catch (error) {
            throw new HttpException('Failed to retrieve ops state', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
