import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@common/redis/redis.module';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    void throttlerName;
    const blockKey = `${key}:blocked`;
    const blocked = await this.redis.get(blockKey);

    if (blocked) {
      const timeToBlockExpire = await this.redis.pttl(blockKey);
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire:
          timeToBlockExpire > 0 ? timeToBlockExpire : blockDuration,
      };
    }

    const totalHits = await this.redis.incr(key);

    if (totalHits === 1) {
      await this.redis.pexpire(key, ttl);
    }

    const timeToExpire = await this.redis.pttl(key);

    if (totalHits > limit) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration);
      return {
        totalHits,
        timeToExpire: timeToExpire > 0 ? timeToExpire : ttl,
        isBlocked: true,
        timeToBlockExpire: blockDuration,
      };
    }

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
