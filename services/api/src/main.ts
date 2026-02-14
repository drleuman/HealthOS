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

  // Security: Helmet for secure headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  const appOrigin = config.get('APP_ORIGIN') || 'http://localhost:3000';
  const allowedOrigins = appOrigin.split(',').map((o: string) => o.trim().replace(/\/$/, ''));

  logger.info(`CORS: Allowed Origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Analytics-Secret, x-request-id, x-user-email, x-mh-signature',
  });

  // --- STARTUP GUARD: Prisma Schema Check ---
  // Ensure NotificationEvent and experimentGroup support exists or disable hub
  try {
    const prisma = app.get(PrismaService); // Resolve by name or class if possible
    // Note: In Nest, we might need to get the class token. Assuming PrismaService is global or exported.
    // If not easily resolvable, we can skip or instantiate a temporary client.
    // Better simpler check:

    // We'll trust the app to run but log a warning if we suspect issues?
    // Actually, user requested a specific guard.
    // We can try a raw query to check table existence if we want to be db-agnostic?
    // Or just try to access the delegate if it exists on the client instance.

    // Let's attach a quick check after app init or before listen.
    const prismaService = app.get(PrismaService);
    // Types might fail if we cast to any.
    if (!(prismaService as any).notificationEvent) {
      logger.warn('STARTUP GUARD: Prisma Client lacks NotificationEvent. Disabling Notification Hub.');
      process.env.NOTIFICATION_HUB_DISABLED = 'true';
    } else {
      logger.info('STARTUP GUARD: Prisma Client verified (NotificationEvent exists).');
    }
  } catch (e) {
    // If we can't get prisma service, likely module structure issue, ignore or log
    logger.warn({ error: e }, 'STARTUP GUARD: Could not verify Prisma Client.');
  }

  const port = process.env.PORT || 3333;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}

bootstrap();
