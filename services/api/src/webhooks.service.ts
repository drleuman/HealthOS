import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { MithohacksOrderWebhook } from '@healthos/shared';
import * as crypto from 'crypto';
import { logger } from './logger';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) { }

  private verify(rawBody: Buffer, signature: string) {
    const secret = process.env.WEBHOOK_SECRET || 'dev_webhook';
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    // Timing safe comparison
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  async handleMithohacksOrder(payload: MithohacksOrderWebhook, sig: string, rawBody: Buffer) {
    // 1. RAW Signature Verification
    if (!this.verify(rawBody, sig)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    try {
      // 2. Identify/Create User
      const user = await this.prisma.user.upsert({
        where: { email: payload.email },
        create: { email: payload.email, plan: 'member' },
        update: { plan: 'member' },
      });

      // 3. Robust Idempotency
      const existing = await this.prisma.purchase.findFirst({
        where: { orderId: payload.order_id }
      });
      if (existing) return { ok: true, status: 'idempotent' };

      // 4. Fulfillment
      for (const item of (payload.items || [])) {
        try {
          await this.prisma.purchase.create({
            data: {
              userId: user.id,
              orderId: payload.order_id,
              productSlug: item.product_slug
            },
          });

          await this.prisma.recommendation.create({
            data: {
              userId: user.id,
              type: 'content',
              slug: `guide_${item.product_slug}`,
              reason: `Compra #${payload.order_id}`,
            }
          }).catch(() => { }); // Resilient non-critical task

        } catch (e: any) {
          // Double check unique constraint (P2002) for race conditions
          if (e.code === 'P2002') {
            logger.warn({ orderId: payload.order_id }, 'Idempotent race condition detected');
            return { ok: true, status: 'idempotent_race' };
          }
          throw e;
        }
      }

      logger.info({ orderId: payload.order_id, email: payload.email }, 'Webhook processed successfully');
      return { ok: true, status: 'processed' };
    } catch (e) {
      logger.error({ error: e, orderId: payload.order_id }, 'Webhook processing error');
      return { ok: true, status: 'error_fallback' };
    }
  }
}
