import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CacheMetric } from '@common/decorators/cache-metric.decorator';
import { CacheMetricInterceptor } from '@common/interceptors/cache-metric.interceptor';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { BarbersMetricsResponseDto } from './dto/barbers-metrics.dto';
import { ConversationsMetricsResponseDto } from './dto/conversations-metrics.dto';
import { CustomersMetricsResponseDto } from './dto/customers-metrics.dto';
import {
  DashboardOptionalPeriodQueryDto,
  DashboardQueryDto,
  dashboardOptionalPeriodSchema,
  dashboardQuerySchema,
} from './dto/dashboard-query.dto';
import { PlansMetricsResponseDto } from './dto/plans-metrics.dto';
import { RevenueMetricsResponseDto } from './dto/revenue-metrics.dto';
import { DashboardSummaryResponseDto } from './dto/summary-response.dto';

const CACHE_TTL_SECONDS = 300;

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN, UserRole.GERENTE)
@UseInterceptors(CacheMetricInterceptor)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @CacheMetric('dashboard:summary', CACHE_TTL_SECONDS)
  @ApiOperation({ summary: 'Resumo do dashboard por período' })
  @ApiQuery({
    name: 'period',
    required: true,
    enum: ['today', 'week', 'month', 'year'],
  })
  @ApiResponse({ status: 200, type: DashboardSummaryResponseDto })
  getSummary(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(dashboardQuerySchema))
    query: DashboardQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(tenantId, query.period);
  }

  @Get('customers')
  @CacheMetric('dashboard:customers', CACHE_TTL_SECONDS)
  @ApiOperation({ summary: 'Métricas de clientes' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'year'],
  })
  @ApiResponse({ status: 200, type: CustomersMetricsResponseDto })
  getCustomers(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(dashboardOptionalPeriodSchema))
    query: DashboardOptionalPeriodQueryDto,
  ): Promise<CustomersMetricsResponseDto> {
    return this.dashboardService.getCustomers(tenantId, query.period);
  }

  @Get('revenue')
  @CacheMetric('dashboard:revenue', CACHE_TTL_SECONDS)
  @ApiOperation({ summary: 'Métricas financeiras' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'year'],
  })
  @ApiResponse({ status: 200, type: RevenueMetricsResponseDto })
  getRevenue(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(dashboardOptionalPeriodSchema))
    query: DashboardOptionalPeriodQueryDto,
  ): Promise<RevenueMetricsResponseDto> {
    return this.dashboardService.getRevenue(tenantId, query.period);
  }

  @Get('plans')
  @CacheMetric('dashboard:plans', CACHE_TTL_SECONDS)
  @ApiOperation({ summary: 'Métricas de planos e assinaturas' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'year'],
  })
  @ApiResponse({ status: 200, type: PlansMetricsResponseDto })
  getPlans(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(dashboardOptionalPeriodSchema))
    query: DashboardOptionalPeriodQueryDto,
  ): Promise<PlansMetricsResponseDto> {
    return this.dashboardService.getPlans(tenantId, query.period);
  }

  @Get('conversations')
  @CacheMetric('dashboard:conversations', CACHE_TTL_SECONDS)
  @ApiOperation({ summary: 'Métricas de conversas' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'year'],
  })
  @ApiResponse({ status: 200, type: ConversationsMetricsResponseDto })
  getConversations(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(dashboardOptionalPeriodSchema))
    query: DashboardOptionalPeriodQueryDto,
  ): Promise<ConversationsMetricsResponseDto> {
    return this.dashboardService.getConversations(tenantId, query.period);
  }

  @Get('barbers')
  @CacheMetric('dashboard:barbers', CACHE_TTL_SECONDS)
  @ApiOperation({ summary: 'Performance por barbeiro' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'week', 'month', 'year'],
  })
  @ApiResponse({ status: 200, type: BarbersMetricsResponseDto })
  getBarbers(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(dashboardOptionalPeriodSchema))
    query: DashboardOptionalPeriodQueryDto,
  ): Promise<BarbersMetricsResponseDto> {
    return this.dashboardService.getBarbers(tenantId, query.period);
  }
}
