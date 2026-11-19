import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from '@modules/health/health.controller';
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
} from '@modules/health/health.indicators';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
