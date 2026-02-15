import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from './prisma.service';

export interface ProgramDay {
    day: number;
    title: string;
    learn: string;
    action: string;
    check: string;
    biological_phase?: string;
    system_message?: {
        neutral: string;
        calibration: string;
    };
    tool_unlock?: string | null;
}

export interface ProgramDef {
    id: string;
    duration_days: number;
    days: ProgramDay[];
}

export abstract class ProgramRegistry {
    abstract getProgram(id: string): Promise<ProgramDef>;
}

@Injectable()
export class FileProgramRegistry extends ProgramRegistry {
    private readonly programsDir = path.join(process.cwd(), '..', '..', 'packages', 'shared', 'content', 'programs');
    private readonly logger = new Logger(FileProgramRegistry.name);

    async getProgram(id: string): Promise<ProgramDef> {
        const file = path.join(this.programsDir, `${id}.json`);
        if (!fs.existsSync(file)) {
            this.logger.error(`Program file not found: ${file}`);
            throw new Error(`Program not found: ${id}`);
        }
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
}

@Injectable()
export class DatabaseProgramRegistry extends ProgramRegistry {
    constructor(private prisma: PrismaService) {
        super();
    }

    async getProgram(id: string): Promise<ProgramDef> {
        const program = await this.prisma.program.findUnique({ where: { id } });
        if (!program) throw new Error(`Program not found in DB: ${id}`);
        return program.content as unknown as ProgramDef;
    }
}

@Injectable()
export class CachedProgramRegistry extends ProgramRegistry {
    private cache = new Map<string, { data: ProgramDef; expires: number }>();
    private readonly TTL = 1000 * 60 * 5; // 5 minutes

    constructor(private inner: ProgramRegistry) {
        super();
    }

    async getProgram(id: string): Promise<ProgramDef> {
        const cached = this.cache.get(id);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        const data = await this.inner.getProgram(id);
        this.cache.set(id, { data, expires: Date.now() + this.TTL });
        return data;
    }
}
