import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';
import {
  CACHE_METRIC_KEY,
  CacheMetricOptions,
} from '@common/decorators/cache-metric.decorator';
import { REDIS_CLIENT } from '@common/redis/redis.module';

interface AuthenticatedRequest {
  user?: { tenantId?: string };
  query?: { period?: string };
}

@Injectable()
export class CacheMetricInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const metadata = this.reflector.get<CacheMetricOptions | undefined>(
      CACHE_METRIC_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    const period = request.query?.period ?? 'default';
    const cacheKey = `metric:${tenantId}:${metadata.prefix}:${period}`;

    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }

      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return of(JSON.parse(cached) as unknown);
      }
    } catch {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.redis.set(
            cacheKey,
            JSON.stringify(data),
            'EX',
            metadata.ttlSeconds,
          );
        } catch {
          // Cache write failure must not break the response
        }
      }),
    );
  }
}
