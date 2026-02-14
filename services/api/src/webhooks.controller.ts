import { Body, Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import type { MithohacksOrderWebhook } from '@healthos/shared';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly svc: WebhooksService) { }

  @Post('mithohacks/order')
  async mhOrder(
    @Body() body: MithohacksOrderWebhook,
    @Headers('x-mh-signature') sig: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error('[Webhook] Raw body missing');
      return { ok: false, error: 'Raw body missing' };
    }
    console.log('[Webhook] Raw body received:', rawBody.toString());
    return this.svc.handleMithohacksOrder(body, sig || '', rawBody);
  }
}
