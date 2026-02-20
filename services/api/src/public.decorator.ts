import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const SKIP_THROTTLE_KEY = 'skipThrottle';
export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);

export const REQUIRED_PLAN_KEY = 'requiredPlan';
export const RequiredPlan = (plan: 'free' | 'member' | 'premium' | 'admin') => SetMetadata(REQUIRED_PLAN_KEY, plan);
