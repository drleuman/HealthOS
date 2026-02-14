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

  // --- CORS Configuration ---
  const appOriginRaw = config.get('APP_ORIGIN') || 'https://healthos-ten.vercel.app';
  const prodAllow = appOriginRaw
    .split(',')
    .map((o: string) => o.trim().toLowerCase().replace(/\/$/, ''))
    .filter(Boolean);

  const isDev = (process.env.NODE_ENV || 'development') !== 'production';
  const devAllow = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  const allowlist = new Set([...(isDev ? devAllow : []), ...prodAllow]);

  logger.info(`CORS allowlist (${isDev ? 'dev+prod' : 'prod'}): ${Array.from(allowlist).join(', ')}`);

  app.enableCors({
    origin: (origin, cb) => {
      // Allow server-to-server / curl / health checks with no Origin header
      if (!origin) return cb(null, true);

      const normalized = origin.toLowerCase().replace(/\/$/, '');
      const ok = allowlist.has(normalized);

      if (!ok) logger.warn({ origin: normalized }, 'CORS blocked origin');
      return cb(null, ok);
    },
    credentials: true, // Frontend uses credentials: 'include'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Analytics-Secret',
      'x-request-id',
      'x-user-email',
      'x-mh-signature',
      'Origin',
    ].join(', '),
  });

  // Keep cookieParser if needed for other parts (e.g., auth.controller still sets cookies for non-cors usage)
  app.use(cookieParser());

  // ✅ Re-enable Helmet (safe baseline)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );

  // --- STARTUP GUARD (DB-level, not just client-level) ---
  try {
    const prisma = app.get(PrismaService) as any;
    const hubDisabledEnv = String(process.env.NOTIFICATION_HUB_DISABLED || '').toLowerCase() === 'true';

    if (!hubDisabledEnv) {
      if (!prisma.notificationEvent) {
        logger.error('STARTUP GUARD: Prisma client out of date (missing notificationEvent). Run prisma generate.');
        process.env.NOTIFICATION_HUB_DISABLED = 'true';
      } else {
        // DB table existence check
        await prisma.notificationEvent.count();
        logger.info('STARTUP GUARD: NotificationEvent table OK.');
      }
    } else {
      logger.warn('STARTUP GUARD: Notification hub disabled by env.');
    }
  } catch (e: any) {
    const code = e?.code || e?.name;
    logger.error({ code, message: e?.message }, 'STARTUP GUARD: Schema/DB not ready. Disabling Notification Hub.');
    process.env.NOTIFICATION_HUB_DISABLED = 'true';
  }

  const port = process.env.PORT || 3333;
  await app.listen(port);
  logger.info(`Server running on port ${port}`);
}

bootstrap();
