import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);
    private lastAlertTime = 0;
    private readonly ALERT_COOLDOWN_MS = 30000; // 30 seconds max 1 alert

    private readonly botToken: string;
    private readonly chatId: string;

    constructor(private configService: ConfigService) {
        this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
        this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID') || '';
    }

    async notifyCriticalAlert(title: string, message: string, meta: any = {}): Promise<void> {
        if (!this.botToken || !this.chatId) {
            this.logger.warn('Telegram notifier not configured (missing token/chatId).');
            return;
        }

        const now = Date.now();
        if (now - this.lastAlertTime < this.ALERT_COOLDOWN_MS) {
            this.logger.warn('Telegram alert skipped due to cooldown.');
            return;
        }

        this.lastAlertTime = now;

        const text = `🚨 *HEALTHOS OPs ALERT* 🚨\n\n*Type:* ${title}\n*Message:* ${message}\n\n*Details:*\n\`\`\`json\n${JSON.stringify(meta, null, 2).substring(0, 500)}\n\`\`\`\n\n[Open Dashboard](https://admin.healthos.com/admin/alerts)`;

        try {
            const fetch = (await import('node-fetch')).default;
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text,
                    parse_mode: 'Markdown',
                }),
            });

            if (!response.ok) {
                this.logger.error(`Telegram API error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            this.logger.error('Failed to send Telegram alert', error);
        }
    }
}
