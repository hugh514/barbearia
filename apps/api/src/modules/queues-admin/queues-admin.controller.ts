import { Controller, Get, Param } from '@nestjs/common';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import {
  FailedJobDto,
  QueueStatsDto,
  QueuesAdminService,
} from './queues-admin.service';

@ApiTags('queues')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller('queues')
export class QueuesAdminController {
  constructor(private readonly queuesAdminService: QueuesAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Status das filas de processamento' })
  @ApiResponse({ status: 200, description: 'Contadores por fila' })
  getStats(): Promise<QueueStatsDto[]> {
    return this.queuesAdminService.getStats();
  }

  @Get(':name/failed')
  @ApiOperation({
    summary: 'Últimos 20 jobs falhados de uma fila, só do tenant do token',
  })
  @ApiParam({ name: 'name', type: String })
  @ApiResponse({ status: 200, description: 'Jobs falhados' })
  @ApiResponse({ status: 404, description: 'Fila não encontrada' })
  getFailedJobs(
    @CurrentTenant() tenantId: string,
    @Param('name') name: string,
  ): Promise<FailedJobDto[]> {
    return this.queuesAdminService.getFailedJobs(name, tenantId);
  }
}
