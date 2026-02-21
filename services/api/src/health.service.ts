import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { AssessmentInput, DayLogInput, RoutePayload, TodayPayload, SystemMessage, ActionItem, CommunityThreadPreview, DeviationType } from '@healthos/shared';
import { decideProgram } from './decision.engine';
import { ProgramRegistry } from './program.registry';
import { BehaviorService } from './behavior.service';
import { MicroInterventionService } from './micro-intervention.service';
import { ProtocolEngine } from './behavioral/protocol.engine';
import { Prisma } from '@prisma/client';

import { CommunityService } from './community.service';
import { PlanService } from './plan.service';
import { TrackingService } from './tracking.service';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private registry: ProgramRegistry,
    private behaviorService: BehaviorService,
    private microInterventionService: MicroInterventionService,
    private protocolEngine: ProtocolEngine,
    private communityService: CommunityService,
    private planService: PlanService,
    private tracking: TrackingService
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

  async getToday(email: string): Promise<TodayPayload> {
    try {
      const user = await this.ensureUser(email);
      const state = await this.prisma.userState.findUnique({ where: { userId: user.id } });

      const behaviorStateObj = await this.behaviorService.getUserState(user.id);

      // We don't necessarily need microIntervention for the core contract if it's not in the type, 
      // but let's keep logic if we want to add it to 'protocol.learn' or similar. 
      // The new contract has 'protocol.learn'.
      // const intervention = await this.microInterventionService.getIntervention(user.id, behaviorStateObj.state);

      if (!state) {
        // Fallback / Initial State
        const defaultSysMsg: SystemMessage = {
          i18nKey: 'SystemMessages.Onboarding.welcome',
          params: {},
          selectedRuleId: 'ONBOARDING_WELCOME',
          reason: {}
        };

        return {
          uiMode: 'PROTOCOL',
          status: 'ACTIVE',
          protocolId: 'circadian_reset_14',
          day: 1,
          systemMessage: defaultSysMsg,
          behavior: {
            deviation: null,
            reentry: { eligible: false },
            recalibration: { status: 'NONE' },
            minimalMode: null
          },
          protocol: {
            actions: [{ id: 'get_light_10min', labelKey: 'Actions.get_light_10min.label', type: 'light', status: 'pending' }],
            check: null,
            learn: null,
            progress: 0
          },
          community: { threads: [], primaryThreadId: null }
        };
      }

      const program = await this.registry.getProgram(state.programId);
      const currentDay = Math.min(state.currentDay, program.duration_days);
      const lesson = program.days.find(d => d.day === currentDay) || program.days[0];

      // --- 1. Mode Determination ---
      const behaviorCtx = (behaviorStateObj?.context as any) || {};

      let uiMode: 'PROTOCOL' | 'OBSERVATION' | 'RECALIBRATION' = 'PROTOCOL';
      if (behaviorStateObj?.status === 'COMPLETED') {
        uiMode = 'OBSERVATION';
      } else if (behaviorStateObj?.programId === 'recalibration_3d' || behaviorCtx.recalibration?.status === 'ACTIVE') {
        uiMode = 'RECALIBRATION';
      }

      // --- 2. Protocol Actions & Checks (Only for PROTOCOL/RECALIBRATION) ---
      let protocolData = undefined;

      if (uiMode !== 'OBSERVATION') {
        const rawTaskKeys = [lesson.action, 'simple_meal_today', 'breathing_3min'];

        // Check completion status from DB
        const logs = await this.prisma.dailyLog.findMany({
          where: { userId: user.id, day: currentDay, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
        });
        const completedAction = logs.some(l => l.actionCompleted); // Simplified for MVP

        const actions: ActionItem[] = rawTaskKeys.map(k => {
          const def = this.ACTION_DEFINITIONS[k] || { title: k };
          return {
            id: k,
            labelKey: `Actions.${k}.label`, // Enforce key convention
            type: def.type || 'generic',
            status: completedAction ? 'completed' : 'pending',
            meta: { minutes: def.minutes, window: def.window }
          };
        });

        // Map Check
        const checkDef = lesson.check ? this.CHECK_DEFINITIONS[lesson.check] : null;
        let checkObj = null;
        if (checkDef) {
          checkObj = {
            id: lesson.check,
            labelKey: `Checks.${lesson.check}.question`,
            options: checkDef.options.map((opt, i) => ({
              id: `opt_${i}`, // or specific IDs if we had them
              labelKey: `Checks.${lesson.check}.options.${i}`
            }))
          };
        }

        const completedCount = await this.prisma.dailyLog.count({ where: { userId: user.id, actionCompleted: true } });

        protocolData = {
          actions,
          check: checkObj,
          learn: lesson.learn ? {
            id: 'daily_lesson',
            titleKey: `Protocol.${program.id}.Day${currentDay}.title`,
            summaryKey: `Protocol.${program.id}.Day${currentDay}.learn`
          } : null,
          progress: Math.min(100, Math.floor((completedCount / program.duration_days) * 100))
        };
      }

      // --- 3. System Message Construction ---
      // We need to fetch the LATEST message generated by behavior service or fallback
      // For now, let's use the one from the behavior state context if available, or generate a default one.
      // Ideally, the behavior service should have stored the 'last message' in the state context.
      // If not, we might need to regenerate it (expensive) or use a fallback.

      // Checking behavior service output... it stores `generatedMessage` in `BehaviorAnalysis`.
      // It DOES NOT explicitely store it in `UserBehaviorState.context` in the file I read.
      // However, `logDay` returns it.
      // For `getToday`, we should probably look at the latest `BehaviorAnalysis` or `DailyLog` message?
      // OR, the contract suggests the frontend is stateless regarding message, so we must provide it.
      // Let's defer to a safe default or 'Daily Update' if we can't find a specific triggered message.

      // Let's check `behaviorCtx.lastMessage`. If not present, we use a basic one.

      const sysMsgI18nKey = (behaviorCtx as any)?.lastMessage?.key || `SystemMessages.${program.id}.day_${currentDay}`;
      const sysMsgParams = (behaviorCtx as any)?.lastMessage?.params || {};
      const sysMsgReason = (behaviorCtx as any)?.lastMessage?.reason || {};
      const sysMsgRule = (behaviorCtx as any)?.lastMessage?.selectedRuleId || 'daily_default';

      const systemMessage: SystemMessage = {
        i18nKey: sysMsgI18nKey,
        params: sysMsgParams,
        selectedRuleId: sysMsgRule,
        reason: sysMsgReason
      };

      // --- 4. Deviation & Behavior ---
      // Ensure strict mapping
      const deviationRaw = behaviorCtx.deviation;
      const deviation = deviationRaw ? {
        active: true,
        type: (deviationRaw.type?.toUpperCase() || 'DRIFT') as DeviationType, // Force UPPERCASE to matching Enum
        severity: deviationRaw.severity,
        cooldownUntil: deviationRaw.cooldownUntil,
        evalCount: deviationRaw.evalCount,
        suggestionCount: deviationRaw.suggestionCount
      } : null;

      // --- 5. Community (Real Data) ---
      const threads: CommunityThreadPreview[] = [];

      let threadFilter: any = {};
      if (uiMode === 'OBSERVATION') {
        // In Observation, show general community or specific observation threads
        threadFilter = { scope: 'general', limit: 3 };
      } else {
        // In Protocol/Recalibration, show day-specific threads
        threadFilter = {
          scope: 'program_day',
          protocolId: program.id, // Use canonical ID
          day: currentDay,
          limit: 1
        };
      }

      const communityThreads = await this.communityService.getThreads(threadFilter);

      // If PROTOCOL mode and no thread exists for this day, ensure one exists (MVP auto-create)
      if (uiMode !== 'OBSERVATION' && communityThreads.length === 0) {
        const newThread = await this.communityService.ensureProtocolThread(
          program.id, // Use canonical ID
          currentDay,
          `Día ${currentDay}: ${lesson.title}` // Fallback title
        );
        communityThreads.push(newThread as any);
      }

      // Map to Preview
      communityThreads.forEach((t: any) => {
        threads.push({
          id: t.id,
          scope: t.scope as any,
          titleKey: t.scope === 'program_day'
            ? `Protocol.${program.id}.Day${t.day}.title` // Reuse existing protocol titles
            : (t.title || 'Community.threads.general'),
          lastActivityAt: t.lastActivityAt.toISOString(),
          replyCount: t._count?.replies || 0
        });
      });

      // --- 6. Legacy/Optional ---
      const completed = await this.prisma.dailyLog.count({ where: { userId: user.id, actionCompleted: true } });
      const recommendation = (completed >= 3 && lesson.tool_unlock) ? lesson.tool_unlock : null;

      const jobResults = await this.prisma.jobResult.findMany({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      return {
        uiMode,
        status: (behaviorStateObj.status as any) || 'ACTIVE',
        protocolId: program.id, // Use canonical ID
        day: currentDay,
        systemMessage,
        behavior: {
          deviation,
          reentry: {
            eligible: !!behaviorCtx.deviation?.active && behaviorStateObj.status === 'COMPLETED',
            cooldownUntil: behaviorCtx.reentry?.cooldownUntil || null
          },
          recalibration: {
            status: behaviorCtx.recalibration?.status || 'NONE',
            dayIndex: behaviorCtx.recalibration?.dayIndex,
            outcome: behaviorCtx.recalibration?.outcome
          },
          minimalMode: behaviorCtx.minimalMode || null
        },
        protocol: protocolData,
        community: {
          threads,
          primaryThreadId: threads.length > 0 ? threads[0].id : null,
          threadOfDayId: threads.find(t => t.scope === 'program_day')?.id || null, // Bonus: explicit ID for day thread
          labelKey: 'App.Community.view_group'
        }
      };

    } catch (e: any) {
      console.error("getToday error", e);
      // Fail-safe fallback matching strict type
      return {
        uiMode: 'PROTOCOL',
        status: 'ACTIVE',
        protocolId: 'error_fallback',
        day: 1,
        systemMessage: { i18nKey: 'SystemMessages.Error.fallback', params: {}, selectedRuleId: 'ERROR', reason: {} },
        behavior: { deviation: null, reentry: { eligible: false }, recalibration: { status: 'NONE' }, minimalMode: null },
        protocol: { actions: [], check: null, learn: null, progress: 0 },
        community: { threads: [], primaryThreadId: null }
      };
    }
  }

  async getRoute(email: string, userPlan: string): Promise<any> {
    try {
      const user = await this.ensureUser(email);
      const policy = this.planService.getPolicy(userPlan);

      const state = await this.prisma.userState.findUnique({ where: { userId: user.id } });
      const programId = state?.programId || 'circadian_reset_14';
      const currentDay = state?.currentDay || 1;
      const program = await this.registry.getProgram(programId);

      const logs = await this.prisma.dailyLog.findMany({
        where: { userId: user.id, actionCompleted: true },
        select: { day: true }
      });
      const completedDays = new Set(logs.map((l: any) => l.day));

      let isGated = false;
      const days = Array.from({ length: program.duration_days }, (_, i) => {
        const d = i + 1;
        const def = program.days.find(x => x.day === d);

        // Calculate phase (mocking phase logic for now: every 7 days is a phase)
        const phase = Math.ceil(d / 7);
        const lockedByPlan = phase > policy.routePhaseMax;

        if (lockedByPlan) isGated = true;

        let status: 'done' | 'current' | 'locked' = 'locked';
        if (completedDays.has(d) || d < currentDay) {
          status = 'done';
        } else if (d === currentDay) {
          status = 'current';
        }

        return {
          day: d,
          title: lockedByPlan ? '🔒 Upgrade Required' : (def?.title || `Día ${d}`),
          status: lockedByPlan ? 'locked' : status,
          lockedByPlan
        };
      });

      if (isGated) {
        this.tracking.trackPlanGated(user.id, userPlan, 'route_phase_max', false).catch(() => { });
      }

      const data = {
        program_id: programId,
        current_day: currentDay,
        duration_days: program.duration_days,
        days,
      };

      return this.planService.buildEnvelope(data, userPlan, 'route_phase_max', isGated);
    } catch (e) {
      console.error('getRoute Error:', e);
      // Always return a valid shape so frontend never crashes on .filter()
      return {
        data: {
          program_id: null,
          current_day: 1,
          duration_days: 0,
          days: [],
        }
      };
    }
  }

  async logDay(email: string, userPlan: string, input: DayLogInput) {
    const user = await this.ensureUser(email);
    const policy = this.planService.getPolicy(userPlan);

    const logCount = await this.prisma.dailyLog.count({ where: { userId: user.id } });
    if (logCount >= policy.dailyLogMaxTotal) {
      this.tracking.trackPlanGated(user.id, userPlan, 'daily_log_max_total', true).catch(() => { });
      return {
        ok: false,
        gated: true,
        reason: 'UPGRADE_REQUIRED',
        feature: 'daily_log_max_total',
        message_key: 'App.Paywall.LogLimit'
      };
    }

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

      // Map GenerateMessage to SystemMessage
      const rawMsg = behaviorResult.systemMessage;
      const systemMessage: SystemMessage = {
        i18nKey: rawMsg.key,
        params: rawMsg.params,
        selectedRuleId: rawMsg.selectedRuleId,
        reason: rawMsg.reason
      };

      return {
        ok: true,
        streak: nextStreak,
        currentDay: behaviorResult.nextDay,
        message: systemMessage // Return strict structure
      };
    } catch (e: any) {
      console.error('logDay Error:', e);
      return { ok: false, error: 'Failed to process log' };
    }
  }

  async closeProtocol(email: string, input: { completionType?: string; reason?: string }) {
    const user = await this.ensureUser(email);
    return this.behaviorService.manualClose(user.id, {
      userRequested: true,
      reason: input.reason
    });
  }

  async reactivateProtocol(email: string) {
    const user = await this.ensureUser(email);
    const updatedState = await this.protocolEngine.reactivateProtocol(user.id);

    // Sync with legacy userState
    await this.prisma.userState.update({
      where: { userId: user.id },
      data: {
        programId: updatedState.programId,
        currentDay: updatedState.dayIndex,
        lastActive: new Date()
      }
    });

    return { ok: true, state: updatedState };
  }

  async handleReentryDecision(email: string, decision: 'ACCEPT' | 'DECLINE', planId: string) {
    const user = await this.ensureUser(email);
    const result = await this.protocolEngine.recordReentryDecision(user.id, decision, planId);

    if (decision === 'ACCEPT') {
      // Sync legacy state
      await this.prisma.userState.update({
        where: { userId: user.id },
        data: {
          programId: result.programId,
          currentDay: result.dayIndex,
          lastActive: new Date()
        }
      });
    }

    return { ok: true, result };
  }
}
