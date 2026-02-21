import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './global-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { logger } from './logger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PrismaService } from './prisma.service';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SystemAlertsService } from './system-alerts/system-alerts.service';

const env = process.env.NODE_ENV || 'development';
const sentrySampleRate = env === 'production' ? 0.1 : (env === 'staging' ? 0.5 : 1.0);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: sentrySampleRate,
  profilesSampleRate: sentrySampleRate,
  release: process.env.npm_package_version || '1.0.0',
  environment: env,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['error', 'warn', 'log'],
  });

  // Safe to trust proxy for Vercel/Plesk deployments
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  const config = app.get(ConfigService);
  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  const isDev = !isProd;

  // --- Startup Validation ---
  const jwtSecret = config.get('API_JWT_SECRET');
  if (isProd && (!jwtSecret || jwtSecret === 'dev_secret' || jwtSecret.length < 32)) {
    logger.error('FATAL: API_JWT_SECRET is missing, weak, or insecure in production.');
    process.exit(1);
  }

  // Inside bootstrap:
  const { httpAdapter } = app.get(HttpAdapterHost);
  const systemAlerts = app.get(SystemAlertsService);

  // Apply global exception filters (Sentry wrapper around the BaseExceptionFilter)
  app.useGlobalFilters(
    new SentryExceptionFilter(httpAdapter, systemAlerts),
    new GlobalExceptionFilter()
  );

  app.useGlobalInterceptors(new LoggingInterceptor());

  // --- CORS Configuration ---
  const appOriginRaw = config.get('APP_ORIGIN') || 'https://healthos-ten.vercel.app';
  const prodAllow = appOriginRaw
    .split(',')
    .map((o: string) => o.trim().toLowerCase().replace(/\/$/, ''))
    .filter(Boolean);

  const devAllow = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  const allowlist = new Set([
    ...(isDev ? devAllow : []),
    ...prodAllow,
  ]);

  logger.info(`CORS allowlist: ${Array.from(allowlist).join(', ')}`);

  app.enableCors({
    origin: (origin, callback) => {
      // If no origin (e.g. mobile apps or curl), allow it
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.toLowerCase().replace(/\/$/, '');

      // Exact match
      if (allowlist.has(normalizedOrigin)) {
        return callback(null, true);
      }

      // Vercel Preview support (Strictly only in non-production)
      if (isDev && normalizedOrigin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked for origin: ${origin}`);
      callback(null, false); // Safe block without throwing
    },
    credentials: isDev, // Bearer strategy doesn't need credentials in prod
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Analytics-Secret',
      'x-request-id',
      'x-mh-signature', // Signature for SSO/Internal
      'Origin',
    ],
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
