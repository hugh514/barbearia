import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import {
  CreatePlanDto,
  createPlanSchema,
} from '@modules/plans/dto/create-plan.dto';
import {
  PlanQueryDto,
  planQuerySchema,
} from '@modules/plans/dto/plan-query.dto';
import {
  PaginatedPlansResponseDto,
  PlanResponseDto,
} from '@modules/plans/dto/plan-response.dto';
import {
  UpdatePlanDto,
  updatePlanSchema,
} from '@modules/plans/dto/update-plan.dto';
import { PlansService } from '@modules/plans/plans.service';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar plano de assinatura' })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({ status: 201, type: PlanResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createPlanSchema)) body: CreatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.plansService.create(tenantId, body);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar planos do tenant' })
  @ApiQuery({ name: 'active', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedPlansResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(planQuerySchema)) query: PlanQueryDto,
  ): Promise<PaginatedPlansResponseDto> {
    return this.plansService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Detalhes de um plano' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlanResponseDto> {
    return this.plansService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar plano' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePlanSchema)) body: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.plansService.update(tenantId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Desativar plano (soft-disable)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  async softDisable(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlanResponseDto> {
    return this.plansService.softDisable(tenantId, id);
  }
}
