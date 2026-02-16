export type Goal = 'sleep' | 'energy' | 'digestion' | 'weight' | 'stress' | 'performance';

export interface AssessmentInput {
  primary_goal: Goal;
  sleep_issue_type?: string[];
  low_energy_window?: string;
  bedtime: string;        // "HH:MM"
  caffeine_time: string;  // "HH:MM"
  dinner_time: string;    // "HH:MM"
  symptoms?: string[];
  constraints?: string[];
}

export interface AssessmentResult {
  profile_type: string;
  program_id: string;
  starting_day: number;
  daily_time_minutes: number;
  priority_actions: string[];
}

export type UIMode = "PROTOCOL" | "OBSERVATION" | "RECALIBRATION";
export type ProtocolStatus = "ACTIVE" | "COMPLETED";
export type RecalibrationStatus = "NONE" | "OFFERED" | "ACTIVE";

export type DeviationType = "DRIFT" | "LATENT_INSTABILITY" | "CRITICAL_DISCONNECT";

export type SystemMessage = {
  i18nKey: string;
  params?: Record<string, string | number | boolean>;
  selectedRuleId?: string;     // audit
  reason?: Record<string, any>; // snapshot metrics
};

export type ActionItem = {
  id: string;
  labelKey: string; // i18n key, NO texto
  status?: 'pending' | 'completed'; // Added to support UI state
  type?: string;     // e.g. 'light', 'food' - needed for icons/categorization
  meta?: any;        // For extra data like 'minutes', 'window'
};

export type CommunityThreadPreview = {
  id: string;
  scope: "program_day" | "area" | "general";
  titleKey: string;     // i18n key o contenido CMS
  lastActivityAt: string; // ISO
  replyCount: number;
};

export type TodayPayload = {
  uiMode: UIMode;
  status: ProtocolStatus;

  // context mínimo para routing/auditoría
  protocolId?: string;   // "circadian_reset_14" | ...
  day?: number;          // solo si PROTOCOL/RECALIBRATION

  systemMessage: SystemMessage;

  behavior: {
    deviation?: {
      active: boolean;
      type: DeviationType;
      severity?: number;
      cooldownUntil?: string | null;
      evalCount?: number;
      suggestionCount?: number;
    } | null;

    reentry: {
      eligible: boolean;
      cooldownUntil?: string | null;
    };

    recalibration: {
      status: RecalibrationStatus;
      dayIndex?: number; // 1..3 si ACTIVE
      outcome?: "STABLE" | "UNRESOLVED"; // al cerrar
    };

    minimalMode?: { level: 0 | 1 | 2 } | null;
  };

  // SOLO presente en PROTOCOL o RECALIBRATION
  protocol?: {
    actions: ActionItem[];
    check?: { id: string; labelKey: string; options: { id: string; labelKey: string }[] } | null;
    learn?: { id: string; titleKey: string; summaryKey?: string } | null;
    progress?: number; // Added to keep progress bar functionality
  };

  // Community-first: siempre presente pero puede estar vacío
  community: {
    threads: CommunityThreadPreview[];
    primaryThreadId?: string | null;
    threadOfDayId?: string | null;
    labelKey?: string;
  };
};

export interface RouteDay {
  day: number;
  title: string;
  status: 'done' | 'current' | 'locked';
}

export interface RoutePayload {
  program_id: string;
  current_day: number;
  duration_days: number;
  days: RouteDay[];
}

export interface DayLogInput {
  day: number;
  action_completed: boolean;
  self_report_effect?: any;
}

export interface MithohacksOrderWebhook {
  email: string;
  order_id: string;
  items: { product_slug: string; qty: number }[];
}
// Community Content Lite
export * from './community/types';
export * from './community/loader';
