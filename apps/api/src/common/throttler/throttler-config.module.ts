import { Module } from '@nestjs/common';
import { RedisModule } from '@common/redis/redis.module';
import { RedisThrottlerStorage } from '@common/throttler/redis-throttler.storage';

@Module({
  imports: [RedisModule],
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottlerConfigModule {}
