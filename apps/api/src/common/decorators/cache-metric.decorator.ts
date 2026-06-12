import { SetMetadata } from '@nestjs/common';

export const CACHE_METRIC_KEY = 'cache_metric';

export interface CacheMetricOptions {
  prefix: string;
  ttlSeconds: number;
}

export const CacheMetric = (
  prefix: string,
  ttlSeconds: number,
): MethodDecorator & ClassDecorator =>
  SetMetadata(CACHE_METRIC_KEY, {
    prefix,
    ttlSeconds,
  } satisfies CacheMetricOptions);
