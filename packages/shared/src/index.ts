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

export interface TodayPayload {
  day: number;
  program_id: string;
  tasks: string[];
  progress_week: number;
  community_group: string;
  recommendation: string | null;
  banners?: Array<{
    id: string;
    type: string;
    message: string | null;
    data: any;
  }>;
  lastRecordAt?: Date | string | null;
  // Perception System Fields
  check?: string | null;
  biological_phase?: string | null;
  system_message?: {
    neutral: string;
    calibration: string;
  } | null;
}

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
