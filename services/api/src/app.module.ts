import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ProgramRegistry, FileProgramRegistry, CachedProgramRegistry } from './program.registry';
import { HealthController as ObservabilityController } from './health.controller.observability';
import { RequestIdMiddleware } from './request-id.middleware';
import { JobsService } from './jobs.service';
import { JobScheduler } from './job-scheduler.service';
import { JobsController } from './jobs.controller';
import { BehaviorService } from './behavior.service';
import { BehaviorController } from './behavior.controller';
import { SecretsValidator } from './secrets-validator.service';
import { CustomThrottlerGuard } from './custom-throttler.guard';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { RefreshTokenService } from './refresh-token.service';
import { PlanService } from './plan.service';
import { MicroInterventionService } from './micro-intervention.service';
import { OpsController } from './analytics/ops.controller';
import { NotificationHubService } from './notifications/notification-hub.service';
import { KpiService } from './analytics/kpi.service';
import { SERService } from './analytics/ser.service';
import { ExperimentRegistry } from './analytics/experiment-registry';
import { OpsDigestService } from './analytics/ops-digest.service';
import { ControlCenterService } from './analytics/control-center.service';
import { ControlCenterController } from './analytics/control-center.controller';
import { AppController } from './app.controller';
import { PerceptionInterpreter } from './behavioral/perception.interpreter';
import { StateEngine } from './behavioral/state.engine';
import { ProtocolEngine } from './behavioral/protocol.engine';
import { MessageGenerationService } from './behavioral/message-generation.service';
import { ProtocolContentService } from './content/protocol-content.service';
import { SystemMessageService } from './behavioral/system-message.service';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { ClinicalInterpretationService } from './behavioral/clinical-interpretation.service';
import { StateTrajectoryService } from './behavioral/state-trajectory.service';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    CatalogModule,
  ],
  controllers: [
    AppController,
    HealthController,
    AuthController,
    WebhooksController,
    ObservabilityController,
    JobsController,
    TrackingController,
    BehaviorController,
    OpsController,
    ControlCenterController,
    CommunityController
  ],
  providers: [
    PrismaService,
    HealthService,
    AuthService,
    WebhooksService,
    JobsService,
    JobScheduler,
    BehaviorService,
    MicroInterventionService,
    NotificationHubService,
    KpiService,
    SERService,
    ExperimentRegistry,
    OpsDigestService,
    ControlCenterService,
    SecretsValidator,
    TrackingService,
    RefreshTokenService,
    PlanService,
    FileProgramRegistry,
    // Behavioral & Content Services
    PerceptionInterpreter,
    StateEngine,
    ProtocolEngine,
    MessageGenerationService,
    ProtocolContentService,
    SystemMessageService,
    CommunityService,
    ClinicalInterpretationService,
    StateTrajectoryService,
    {
      provide: ProgramRegistry,
      useFactory: (fileRegistry: FileProgramRegistry) => {
        return new CachedProgramRegistry(fileRegistry);
      },
      inject: [FileProgramRegistry],
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
