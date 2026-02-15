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

      await this.prisma.dailyLog.create({
    data: {
      userId: user.id,
      day: input.day,
      actionCompleted: input.action_completed,
      selfReportEffect: input.self_report_effect || Prisma.DbNull,
    }
  });

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

  private readonly TASK_TRANSLATIONS: Record<string, string> = {
  'get_light_10min': 'Recibir luz natural (10 min)',
  'dinner_before_21_00': 'Cenar antes de las 21:00',
  'reduce_blue_light': 'Reducir luz azul (pantallas)',
  'delay_caffeine_60': 'Retrasar cafeína 60 min',
  'walk_10min': 'Caminar 10 min',
  'blue_light_shutdown': 'Apagar pantallas con luz azul',
  'downshift_10min': 'Relajación pre-sueño (10 min)',
  'simple_meal_today': 'Comida sencilla (baja carga)',
  'no_snacking': 'Sin snacks entre comidas',
  'breathing_3min': 'Respiración consciente (3 min)',
  'energy_after': '¿Cómo está tu energía?',
  'wakeups': '¿Cuántas veces has despertado?',
  'sleep_latency': '¿Cuánto tardaste en dormir?',
  'headache': '¿Tienes dolor de cabeza?',
  'bloating': '¿Sientes hinchazón?',
  'hunger': '¿Nivel de hambre?',
  'calmness': '¿Nivel de calma?',
  'sleep_quality': '¿Calidad del sueño?'
};

  private readonly RECOMMENDATION_TRANSLATIONS: Record<string, string> = {
  'blue_light_glasses': 'Gafas de bloqueo de luz azul',
  'ashwagandha_extract': 'Extracto de Ashwagandha',
  'magnesium_glycinate': 'Glicinato de Magnesio',
  'red_light_panel': 'Panel de luz roja'
};

  async getToday(email: string): Promise < TodayPayload & { behavior?: any, microIntervention?: any } > {
  try {
    const user = await this.ensureUser(email);
    const state = await this.prisma.userState.findUnique({ where: { userId: user.id } });

    // Behavior Inisghts & Interventions
    const behaviorStateObj = await this.behaviorService.getUserState(user.id);
    const intervention = await this.microInterventionService.getIntervention(user.id, behaviorStateObj.state);

    if(!state) {
      return {
        day: 1,
        program_id: 'circadian_reset_14',
        tasks: [this.TASK_TRANSLATIONS['get_light_10min'] || 'get_light_10min'],
        progress_week: 0,
        community_group: 'starter',
        recommendation: null,
        behavior: { state: behaviorStateObj.state, updatedAt: behaviorStateObj.updatedAt },
        microIntervention: intervention
      };
    }

      const program = await this.registry.getProgram(state.programId);
    const currentDay = Math.min(state.currentDay, program.duration_days);
    const lesson = program.days.find(d => d.day === currentDay) || program.days[0];

    const rawTasks = [lesson.action, 'simple_meal_today', 'breathing_3min'];
    const tasks = rawTasks.map(t => this.TASK_TRANSLATIONS[t] || t);

    const completed = await this.prisma.dailyLog.count({ where: { userId: user.id, actionCompleted: true } });
    let recommendationSlug = (completed >= 3 && lesson.tool_unlock) ? lesson.tool_unlock : null;
    let recommendation = recommendationSlug ? (this.RECOMMENDATION_TRANSLATIONS[recommendationSlug] || recommendationSlug) : null;

    if(recommendationSlug) {
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
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
      tasks,
      progress_week: Math.min(100, Math.floor((completed / program.duration_days) * 100)),
      community_group: `${state.programId}_day_${currentDay}`,
      recommendation,
      banners,
      behavior: { state: behaviorStateObj.state, updatedAt: behaviorStateObj.updatedAt },
      microIntervention: intervention,
      lastRecordAt: lastLog?.createdAt || null
    };
  } catch(e) {
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

  async getRoute(email: string): Promise < RoutePayload > {
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
  } catch(e) {
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
  try {
    const user = await this.ensureUser(email);
    const state = await this.prisma.userState.findUnique({ where: { userId: user.id } });
    if (!state) return { ok: false };

    const program = await this.registry.getProgram(state.programId);

    await this.prisma.dailyLog.create({
      data: {
        userId: user.id,
        day: input.day,
        actionCompleted: input.action_completed,
        selfReportEffect: input.self_report_effect || Prisma.DbNull,
      }
    });

    const nextStreak = input.action_completed ? state.streak + 1 : 0;

    let nextDay = state.currentDay;
    if (input.action_completed && input.day === state.currentDay) {
      nextDay = Math.min(state.currentDay + 1, program.duration_days);
    }

    await this.prisma.userState.update({
      where: { userId: user.id },
      data: {
        streak: nextStreak,
        currentDay: nextDay,
        lastActive: new Date(),
      }
    });

    return { ok: true, streak: nextStreak, currentDay: nextDay };
  } catch (e) {
    console.log('Mock logDay success');
    return { ok: true, mock: true };
  }
}
}
