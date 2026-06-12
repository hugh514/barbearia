import { Module } from '@nestjs/common';
import { CacheMetricInterceptor } from '@common/interceptors/cache-metric.interceptor';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, CacheMetricInterceptor],
})
export class DashboardModule {}
