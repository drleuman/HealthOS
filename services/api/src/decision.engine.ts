import type { AssessmentInput, AssessmentResult } from '@healthos/shared';
import { parseTimeToDate, isAfter } from './utils/time';

export function decideProgram(input: AssessmentInput): AssessmentResult {
  const bedtime = parseTimeToDate(input.bedtime);
  const dinner = parseTimeToDate(input.dinner_time);

  const symptoms = new Set(input.symptoms || []);
  const constraints = new Set(input.constraints || []);

  // Circadian score
  let circ = 0;
  if (isAfter(bedtime, 0, 0)) circ += 2;         // bedtime > 00:00
  if (isAfter(dinner, 21, 30)) circ += 2;        // dinner > 21:30
  if (symptoms.has('wake_3am')) circ += 2;
  if (input.low_energy_window === 'morning') circ += 1;

  // Stress score
  let stress = 0;
  if (symptoms.has('sugar_cravings')) stress += 2;
  if (symptoms.has('irritability')) stress += 1;
  if (symptoms.has('brain_fog')) stress += 1;
  if (constraints.has('kids')) stress += 2;

  // Digestive score
  let dig = 0;
  if (symptoms.has('bloating')) dig += 2;
  if (symptoms.has('reflux')) dig += 2;
  if (symptoms.has('constipation_or_diarrhea')) dig += 2;
  if (symptoms.has('post_meal_crash')) dig += 1;

  let program_id = 'circadian_reset_14';
  let profile_type = 'circadian_dysregulation';

  if (circ >= 5) {
    program_id = 'circadian_reset_14';
    profile_type = stress >= 4 ? 'circadian_dysregulation_with_stress' : 'circadian_dysregulation';
  } else if (dig >= 5 && input.primary_goal === 'digestion') {
    program_id = 'digestive_reset_14';
    profile_type = 'digestive_reset';
  } else if (stress >= 4 && input.primary_goal === 'stress') {
    program_id = 'nervous_system_reset_10';
    profile_type = 'nervous_system_reset';
  } else {
    program_id = 'circadian_reset_14';
    profile_type = 'starter_reset';
  }

  return {
    profile_type,
    program_id,
    starting_day: 1,
    daily_time_minutes: 8,
    priority_actions: ['morning_light', 'delay_caffeine', 'earlier_dinner'],
  };
}
