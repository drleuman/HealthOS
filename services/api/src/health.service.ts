import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { AssessmentInput, DayLogInput, RoutePayload, TodayPayload } from '@healthos/shared';
import { decideProgram } from './decision.engine';
import { ProgramRegistry } from './program.registry';
import { BehaviorService } from './behavior.service';
import { MicroInterventionService } from './micro-intervention.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private registry: ProgramRegistry,
    private behaviorService: BehaviorService,
    private microInterventionService: MicroInterventionService
  ) { }

  // ... (lines 18-265)



  private async ensureUser(email: string) {
    return this.prisma.user.upsert({
      where: { email },
      create: { email, plan: 'member' },
      update: {},
    }).catch(() => ({ id: 'mock-uuid', email, plan: 'member' }));
  }

  async submitAssessment(email: string, input: AssessmentInput) {
    try {
      const user = await this.ensureUser(email);
      const result = decideProgram(input);

      await this.prisma.assessments.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          primaryGoal: input.primary_goal,
          sleepIssueType: input.sleep_issue_type || [],
          lowEnergyWindow: input.low_energy_window || null,
          bedtime: new Date(`1970-01-01T${input.bedtime}:00Z`),
          caffeineTime: new Date(`1970-01-01T${input.caffeine_time}:00Z`),
          dinnerTime: new Date(`1970-01-01T${input.dinner_time}:00Z`),
          symptoms: input.symptoms || [],
          constraints: input.constraints || [],
        },
        update: {
          primaryGoal: input.primary_goal,
          sleepIssueType: input.sleep_issue_type || [],
          lowEnergyWindow: input.low_energy_window || null,
          bedtime: new Date(`1970-01-01T${input.bedtime}:00Z`),
          caffeineTime: new Date(`1970-01-01T${input.caffeine_time}:00Z`),
          dinnerTime: new Date(`1970-01-01T${input.dinner_time}:00Z`),
          symptoms: input.symptoms || [],
          constraints: input.constraints || [],
        },
      });

      await this.prisma.userState.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          profileType: result.profile_type,
          programId: result.program_id,
          currentDay: 1,
          streak: 0,
          lastActive: new Date(),
        },
        update: {
          profileType: result.profile_type,
          programId: result.program_id,
          lastActive: new Date(),
        },
      });

      return result;
    } catch (e) {
      return decideProgram(input); // Return result even if DB fails
    }
  }

  private readonly ACTION_DEFINITIONS: Record<string, any> = {
    'get_light_10min': { type: 'light', minutes: 10, window: 'morning', title: 'Recibir luz natural' },
    'dinner_before_21_00': { type: 'food', window: 'evening', title: 'Cenar antes de las 21:00' },
    'reduce_blue_light': { type: 'screen', window: 'night', title: 'Reducir luz azul' },
    'delay_caffeine_60': { type: 'caffeine', minutes: 60, window: 'morning', title: 'Retrasar cafeína' },
    'walk_10min': { type: 'movement', minutes: 10, window: 'morning', title: 'Caminar 10 min' },
    'simple_meal_today': { type: 'food', title: 'Comida sencilla' },
    'breathing_3min': { type: 'breath', minutes: 3, title: 'Respiración consciente' },
    'attenuate_lights': { type: 'light', window: 'night', title: 'Atenuar luces' },
    'hydration_500ml': { type: 'water', title: 'Beber 500ml agua' }
  };

  private readonly RECOMMENDATION_TRANSLATIONS: Record<string, string> = {
    'blue_light_glasses': 'Gafas de bloqueo de luz azul',
    'ashwagandha_extract': 'Extracto de Ashwagandha',
    'magnesium_glycinate': 'Glicinato de Magnesio',
    'red_light_panel': 'Panel de luz roja'
  };

  private readonly CHECK_DEFINITIONS: Record<string, { type: string, question: string, options: string[] }> = {
    'signal_strength': {
      type: 'scale',
      question: '¿Qué intensidad tuvo la luz?',
      options: ['Baja (Nublado/Interior)', 'Media (Ventana)', 'Alta (Sol directo)']
    },
    'contrast_perception': {
      type: 'scale',
      question: '¿Notaste la diferencia de luz al atenuar?',
      options: ['No, igual', 'Un poco', 'Sí, mucha calma']
    },
    'metabolic_response': {
      type: 'single_choice',
      question: '¿Cómo sentiste el agua al despertar?',
      options: ['Náusea', 'Neutro', 'Activación', 'Energía']
    }
  };

  async getToday(email: string): Promise<TodayPayload & { behavior?: any, microIntervention?: any }> {
    try {
      const user = await this.ensureUser(email);
      const state = await this.prisma.userState.findUnique({ where: { userId: user.id } });

      const behaviorStateObj = await this.behaviorService.getUserState(user.id);
      const intervention = await this.microInterventionService.getIntervention(user.id, behaviorStateObj.state);

      if (!state) {
        // Default/Fallback State
        return {
          day: 1,
          program_id: 'circadian_reset_14',
          // Return as any because format changed
          tasks: ['get_light_10min'] as any,
          actions: [this.ACTION_DEFINITIONS['get_light_10min']],
          progress_week: 0,
          community_group: 'starter',
          recommendation: null,
          behavior: { state: behaviorStateObj.state, updatedAt: behaviorStateObj.updatedAt },
          microIntervention: intervention
        } as any;
      }

      const program = await this.registry.getProgram(state.programId);
      const currentDay = Math.min(state.currentDay, program.duration_days);
      const lesson = program.days.find(d => d.day === currentDay) || program.days[0];

      const rawTaskKeys = [lesson.action, 'simple_meal_today', 'breathing_3min'];

      // Map keys to full Action objects
      const actions = rawTaskKeys.map(k => ({
        type: k,
        ...this.ACTION_DEFINITIONS[k] || { title: k }
      }));

      // Map Check key to full Check object
      const checkDef = lesson.check ? this.CHECK_DEFINITIONS[lesson.check] : null;
      const checkObj = checkDef ? { id: lesson.check, ...checkDef } : null;

      const completed = await this.prisma.dailyLog.count({ where: { userId: user.id, actionCompleted: true } });
      let recommendationSlug = (completed >= 3 && lesson.tool_unlock) ? lesson.tool_unlock : null;
      let recommendation = recommendationSlug ? (this.RECOMMENDATION_TRANSLATIONS[recommendationSlug] || recommendationSlug) : null;

      if (recommendationSlug) {
        const existingRec = await this.prisma.recommendation.findFirst({
          where: { userId: user.id, slug: recommendationSlug }
        });
        if (!existingRec) {
          await this.prisma.recommendation.create({
            data: {
              userId: user.id,
              type: 'tool',
              slug: recommendationSlug,
              reason: `Desbloqueado tras ${completed} días completados en ${state.programId}`
            }
          }).catch(() => { });
        }
      }

      const jobResults = await this.prisma.jobResult.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      const banners = jobResults.map((jr: any) => ({
        id: jr.id,
        type: jr.jobType,
        message: jr.message,
        data: jr.data,
      }));

      const lastLog = await this.prisma.dailyLog.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      return {
        day: currentDay,
        program_id: state.programId,
        tasks: [] as any, // Deprecated in favor of actions
        actions,
        check: checkObj,
        progress_week: Math.min(100, Math.floor((completed / program.duration_days) * 100)),
        community_group: `${state.programId}_day_${currentDay}`,
        recommendation,
        banners,
        behavior: { state: behaviorStateObj.state, updatedAt: behaviorStateObj.updatedAt },
        microIntervention: intervention,
        lastRecordAt: lastLog?.createdAt || null,
        biological_phase: lesson.biological_phase || null,
        system_message: lesson.system_message || null
      } as any;

    } catch (e) {
      return {
        day: 1,
        program_id: 'circadian_reset_14 (MOCK)',
        tasks: ['get_light_10min', 'simple_meal_today', 'breathing_3min'],
        progress_week: 0,
        community_group: 'mock_group',
        recommendation: 'blue_light_glasses',
      };
    }
  }

  async getRoute(email: string): Promise<RoutePayload> {
    try {
      const user = await this.ensureUser(email);
      const state = await this.prisma.userState.findUnique({ where: { userId: user.id } });
      const programId = state?.programId || 'circadian_reset_14';
      const currentDay = state?.currentDay || 1;
      const program = await this.registry.getProgram(programId);

      const logs = await this.prisma.dailyLog.findMany({
        where: { userId: user.id, actionCompleted: true },
        select: { day: true }
      });
      const completedDays = new Set(logs.map((l: any) => l.day));

      const days = Array.from({ length: program.duration_days }, (_, i) => {
        const d = i + 1;
        const def = program.days.find(x => x.day === d);

        let status: 'done' | 'current' | 'locked' = 'locked';
        if (completedDays.has(d) || d < currentDay) {
          status = 'done';
        } else if (d === currentDay) {
          status = 'current';
        }

        return {
          day: d,
          title: def?.title || `Día ${d}`,
          status,
        };
      });

      return {
        program_id: programId,
        current_day: currentDay,
        duration_days: program.duration_days,
        days,
      };
    } catch (e) {
      return {
        program_id: 'circadian_reset_14 (MOCK)',
        current_day: 1,
        duration_days: 14,
        days: [
          { day: 1, title: 'Luz de mañana', status: 'done' },
          { day: 2, title: 'Cena temprana', status: 'current' },
          { day: 3, title: 'Pantallas', status: 'locked' },
        ]
      };
    }
  }

  async logDay(email: string, input: DayLogInput) {
    const user = await this.ensureUser(email);
    const state = await this.prisma.userState.findUnique({ where: { userId: user.id } });
    if (!state) return { ok: false };

    try {
      // Delegate to Behavioral Engine (The "Brain")
      const behaviorResult = await this.behaviorService.processDailyLog(user.id, {
        day: input.day,
        actionCompleted: input.action_completed,
        selfReportEffect: input.self_report_effect,
        programContext: {
          programId: state.programId,
          currentPhase: (state as any).currentPhase
        }
      });

      // Update Legacy/Gamified State (The "Scoreboard")
      const nextStreak = input.action_completed ? state.streak + 1 : 0;

      await this.prisma.userState.update({
        where: { userId: user.id },
        data: {
          streak: nextStreak,
          currentDay: behaviorResult.nextDay, // Use engine's decision
          lastActive: new Date(),
        }
      });

      return {
        ok: true,
        streak: nextStreak,
        currentDay: behaviorResult.nextDay,
        message: behaviorResult.systemMessage
      };
    } catch (e: any) {
      console.error('logDay Error:', e);
      return { ok: false, error: 'Failed to process log' };
    }
  }
}
