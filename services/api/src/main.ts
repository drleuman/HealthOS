import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './global-exception.filter';
import { logger } from './logger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PrismaService } from './prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.use(cookieParser());

  // Security: Helmet disabled temporarily for CORS debugging
  // app.use(helmet({ ... }));

  const appOrigin = config.get('APP_ORIGIN') || 'https://healthos-ten.vercel.app';
  const allowedOrigins = appOrigin.split(',').map((o: string) => o.trim().toLowerCase().replace(/\/$/, ''));

  logger.info(`CORS: Allowed Origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Analytics-Secret, x-request-id, x-user-email, x-mh-signature, Origin',
  });

  // --- STARTUP GUARD ---
  try {
    const prismaService = app.get(PrismaService);
    if (!(prismaService as any).notificationEvent) {
      logger.warn('STARTUP GUARD: Prisma Client lacks NotificationEvent. Disabling Notification Hub.');
      process.env.NOTIFICATION_HUB_DISABLED = 'true';
    } else {
      logger.info('STARTUP GUARD: Prisma Client verified.');
    }
  } catch (e) {
    logger.warn({ error: e }, 'STARTUP GUARD: Could not verify Prisma Client.');
  }

  const port = process.env.PORT || 3333;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}

bootstrap();
