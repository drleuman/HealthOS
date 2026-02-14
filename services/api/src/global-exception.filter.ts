import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { logger } from './logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = (request as any).requestId || 'unknown';

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let details: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            message = typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any).message || message;
            details = typeof exceptionResponse === 'object' ? exceptionResponse : undefined;
        } else if (exception instanceof Error) {
            message = exception.message;
            details = { stack: exception.stack };
        }

        logger.error({
            requestId,
            method: request.method,
            url: request.url,
            status,
            message,
            error: exception instanceof Error ? exception.message : String(exception),
            stack: exception instanceof Error ? exception.stack : undefined,
        }, 'Request failed');

        response.status(status).json({
            statusCode: status,
            message,
            requestId,
            timestamp: new Date().toISOString(),
            path: request.url,
            ...(details && { details }),
        });
    }
}
