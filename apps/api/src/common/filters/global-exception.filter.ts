import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { CORRELATION_ID_HEADER } from '@common/interceptors/correlation-id.interceptor';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  correlationId: string;
  timestamp: string;
  path: string;
}

function statusTitle(status: number): string {
  const name = HttpStatus[status];
  if (!name) return 'Error';
  return name
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const correlationId =
      request.correlationId ??
      (request.headers[CORRELATION_ID_HEADER] as string | undefined) ??
      'unknown';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Exceção com corpo em string (ex.: ThrottlerException): o título vem do status.
      error = statusTitle(statusCode);
      if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
        message = 'Muitas requisições. Tente novamente em instantes.';
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string | string[]) ?? message;
        error = (body.error as string) ?? exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        { err: exception, correlationId },
        'Unhandled exception',
      );
      Sentry.captureException(exception);
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }
}
