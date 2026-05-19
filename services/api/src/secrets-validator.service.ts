import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logger } from './logger';

@Injectable()
export class SecretsValidator implements OnModuleInit {
    constructor(private config: ConfigService) { }

    onModuleInit() {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required secrets
        const requiredSecrets = [
            'DATABASE_URL',
            'API_JWT_SECRET',
        ];

        // Recommended secrets
        const recommendedSecrets = [
            'WEBHOOK_SECRET',
            'APP_ORIGIN',
        ];

        // Check required secrets
        for (const secret of requiredSecrets) {
            const value = this.config.get<string>(secret);
            if (!value) {
                errors.push(`Missing required secret: ${secret}`);
            } else if (value.includes('dev_') || value.includes('test_')) {
                warnings.push(`Secret ${secret} appears to be a development value`);
            }
        }

        // Check recommended secrets
        for (const secret of recommendedSecrets) {
            const value = this.config.get<string>(secret);
            if (!value) {
                warnings.push(`Missing recommended secret: ${secret}`);
            }
        }

        // Validate JWT secret strength
        const jwtSecret = this.config.get<string>('API_JWT_SECRET');
        if (jwtSecret && jwtSecret.length < 32) {
            warnings.push('API_JWT_SECRET should be at least 32 characters for production');
        }

        // Validate DATABASE_URL format
        const dbUrl = this.config.get<string>('DATABASE_URL');
        if (dbUrl && !dbUrl.startsWith('mysql://')) {
            warnings.push('DATABASE_URL should use mysql:// protocol');
        }

        // Check NODE_ENV
        const nodeEnv = process.env.NODE_ENV;
        if (nodeEnv === 'production') {
            if (this.config.get<string>('API_JWT_SECRET')?.includes('dev_')) {
                errors.push('Production environment detected with development secrets');
            }
        }

        // Log results
        if (errors.length > 0) {
            logger.error({ errors }, 'Secrets validation failed');
            throw new Error(`Secrets validation failed: ${errors.join(', ')}`);
        }

        if (warnings.length > 0) {
            logger.warn({ warnings }, 'Secrets validation warnings');
        } else {
            logger.info('Secrets validation passed');
        }
    }
}
