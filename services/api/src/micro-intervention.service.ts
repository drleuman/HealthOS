import { Injectable } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { PrismaService } from './prisma.service';
import { logger } from './logger';
import { ExperimentRegistry } from './analytics/experiment-registry';
import { ExperimentGroupService } from './analytics/experiment-group.service';

export interface MicroIntervention {
    type: 'clarify' | 'reduce' | 're_engage' | 'reframe';
    messageKey: string;
    mode: 'simplified' | 'minimum';
}

@Injectable()
export class MicroInterventionService {
    constructor(
        private trackingService: TrackingService,
        private prisma: PrismaService,
        private experimentRegistry: ExperimentRegistry
    ) { }

    private readonly TRANSLATIONS: Record<string, string> = {
        'clarify_today': 'Hemos detectado fricción en la instrucción. Aquí tienes una versión directa para hoy.',
        'reduce_today': 'Carga cognitiva alta detectada. Hemos simplificado la tarea al mínimo para proteger tu racha.',
        'come_back_easy': 'Re-entrada detectada. Ignora los días perdidos; el éxito hoy es solo aparecer.',
        'reframe_goal': 'Señal de fatiga identificada. Una pequeña acción hoy protege tu progreso a largo plazo.'
    };

    async getIntervention(userId: string, state: string): Promise<MicroIntervention & { message: string } | null> {
        // PHASE 1: Determine or Retrieve Experiment Group
        const userState = await this.prisma.userState.findUnique({
            where: { userId },
            select: { experimentGroup: true }
        });

        let group = userState?.experimentGroup;

        if (!group) {
            // Fetch primary goal for stratification if available
            const assessment = await this.prisma.assessments.findUnique({
                where: { userId },
                select: { primaryGoal: true }
            });

            group = ExperimentGroupService.getGroupForUser(userId, assessment?.primaryGoal || "");

            // Non-blocking update to persist group
            void this.prisma.userState.update({
                where: { userId },
                data: { experimentGroup: group }
            }).catch(() => { });
        }

        // PHASE 2: Control Group Gate (Silent Holdout)
        // GUARD: Control users MUST NEVER receive interventions
        if (group === 'control') {
            return null;
        }

        let intervention: MicroIntervention | null = null;

        // PHASE 4: Check for active experiment and lock strategy
        // During an experiment, product behavior should be frozen
        const activeExperiment = await this.experimentRegistry.getActiveExperiment();

        switch (state) {
            case 'instruction_unclear':
                intervention = {
                    type: 'clarify',
                    messageKey: 'clarify_today',
                    mode: 'simplified'
                };
                break;
            case 'action_too_hard':
                intervention = {
                    type: 'reduce',
                    messageKey: 'reduce_today',
                    mode: 'minimum'
                };
                break;
            case 'early_dropoff':
                intervention = {
                    type: 're_engage',
                    messageKey: 'come_back_easy',
                    mode: 'minimum'
                };
                break;
            case 'motivation_loss':
                intervention = {
                    type: 'reframe',
                    messageKey: 'reframe_goal',
                    mode: 'simplified'
                };
                break;
            case 'on_track':
            default:
                intervention = null;
        }

        if (intervention) {
            // GUARD: Ensure we never track exposure for control group
            if (group === 'control') {
                logger.error({ userId }, 'CRITICAL: Attempted to track intervention exposure for control user.');
                return null;
            }

            this.trackInterventionExposureOncePerDay(userId, state, intervention).catch(err => {
                logger.error({ err, userId }, 'Failed to track intervention exposure');
            });

            return {
                ...intervention,
                message: this.TRANSLATIONS[intervention.messageKey] || intervention.messageKey
            };
        }

        return null;
    }

    private async trackInterventionExposureOncePerDay(userId: string, state: string, intervention: MicroIntervention) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const alreadyTracked = await this.prisma.event.findFirst({
            where: {
                userId,
                event: 'intervention_recommended',
                timestamp: { gte: startOfToday },
                context: {
                    path: '$.intervention_type',
                    equals: intervention.type
                }
            }
        });

        if (alreadyTracked) return;

        void this.trackingService.track({
            event: 'intervention_recommended',
            userId,
            context: {
                behavior_state: state,
                intervention_type: intervention.type,
                intervention_mode: intervention.mode
            }
        }).catch(err => {
            logger.error({ err, userId }, 'Fire-and-forget tracking failed');
        });
    }
}
