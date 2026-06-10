import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      correlationId?: string;
    }>();

    const correlationId =
      request.headers[CORRELATION_ID_HEADER] ??
      request.headers['X-Correlation-Id'] ??
      randomUUID();

    request.correlationId = correlationId;

    const response = context.switchToHttp().getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle().pipe(
      tap(() => {
        // correlation id already set on request/response
      }),
    );
  }
}
