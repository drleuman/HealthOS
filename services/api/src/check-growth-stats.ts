import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);

    const userCount = await prisma.user.count();
    const eventCount = await (prisma as any).event.count();
    const activeUsersLast7d = await prisma.user.count({
        where: {
            lastSeen: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
        }
    });

    console.log('--- HealthOS Current Status ---');
    console.log(`Total Users: ${userCount}`);
    console.log(`Active Users (7d): ${activeUsersLast7d}`);
    console.log(`Total Events: ${eventCount}`);
    console.log('-------------------------------');

    await app.close();
}

bootstrap();
