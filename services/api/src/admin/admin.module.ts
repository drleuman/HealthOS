import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { TrackingService } from '../tracking.service';

@Module({
    controllers: [AdminController],
    providers: [AdminService, PrismaService, TrackingService],
    exports: [AdminService]
})
export class AdminModule { }
