import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

const SENSITIVE_FIELDS = [
  'password',
  'refreshToken',
  'accessToken',
  'passwordHash',
];

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitive(val);
      }
    }
    return result;
  }

  return value;
}

@Injectable()
export class SanitizeLogsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.body && typeof request.body === 'object') {
      (request as Request & { sanitizedBody?: unknown }).sanitizedBody =
        redactSensitive(request.body);
    }

    return next.handle();
  }
}
