import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import type { AssessmentInput, DayLogInput } from '@healthos/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User, UserPayload } from './user.decorator';
import { SubscriptionGuard } from './subscription.guard';
import { RequiredPlan } from './public.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly svc: HealthService) { }

  @Post('assessment')
  async assessment(@Body() body: AssessmentInput, @User() user: UserPayload) {
    return this.svc.submitAssessment(user.email, body);
  }

  @UseGuards(SubscriptionGuard)
  @RequiredPlan('member')
  @Get('user/today')
  async today(@User() user: UserPayload) {
    return this.svc.getToday(user.email);
  }

  @UseGuards(SubscriptionGuard)
  @RequiredPlan('member')
  @Get('user/route')
  async route(@User() user: UserPayload) {
    return this.svc.getRoute(user.email);
  }

  @UseGuards(SubscriptionGuard)
  @RequiredPlan('member')
  @Post('user/day-log')
  async log(@Body() body: DayLogInput, @User() user: UserPayload) {
    return this.svc.logDay(user.email, body);
  }
}
