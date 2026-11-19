import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { PrismaService } from '@prisma/prisma.service';
import { REDIS_CLIENT } from '@common/redis/redis.module';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database unavailable';
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }
      const pong = await this.redis.ping();
      const isHealthy = pong === 'PONG';
      if (!isHealthy) {
        throw new Error('Redis ping failed');
      }
      return this.getStatus(key, true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Redis unavailable';
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
