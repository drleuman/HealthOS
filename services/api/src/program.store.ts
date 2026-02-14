import * as fs from 'fs';
import * as path from 'path';

export interface ProgramDay {
  day: number;
  title: string;
  learn: string;
  action: string;
  check: string;
  tool_unlock?: string | null;
}
export interface ProgramDef {
  id: string;
  duration_days: number;
  days: ProgramDay[];
}

const programsDir = path.join(process.cwd(), '..', '..', 'packages', 'shared', 'content', 'programs');

export function loadProgram(programId: string): ProgramDef {
  const file = path.join(programsDir, `${programId}.json`);
  if (!fs.existsSync(file)) throw new Error(`Program not found: ${programId}`);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as ProgramDef;
}
