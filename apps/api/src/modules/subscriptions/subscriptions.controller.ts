import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { InternalApiKeyGuard } from '@common/guards/internal-api-key.guard';
import { TenantHeader } from '@common/decorators/tenant-header.decorator';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Public } from '@modules/auth/decorators/public.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import {
  CreateSubscriptionDto,
  createSubscriptionSchema,
} from '@modules/subscriptions/dto/create-subscription.dto';
import {
  SubscriptionQueryDto,
  subscriptionQuerySchema,
} from '@modules/subscriptions/dto/subscription-query.dto';
import {
  PaginatedSubscriptionsResponseDto,
  SubscriptionResponseDto,
} from '@modules/subscriptions/dto/subscription-response.dto';
import { SubscriptionsService } from '@modules/subscriptions/subscriptions.service';

const manualActionSchema = z.enum(['activate', 'suspend', 'renew']);
type ManualAction = z.infer<typeof manualActionSchema>;

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.CLIENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Assinar plano para um cliente' })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Cliente já possui assinatura ativa',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createSubscriptionSchema))
    body: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.create(tenantId, user, body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar assinaturas com filtros' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'planId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedSubscriptionsResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(subscriptionQuerySchema))
    query: SubscriptionQueryDto,
  ): Promise<PaginatedSubscriptionsResponseDto> {
    return this.subscriptionsService.findAll(tenantId, query);
  }

  @Get('me')
  @Roles(UserRole.CLIENTE, UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Minhas assinaturas (cliente logado)' })
  @ApiResponse({ status: 200, type: PaginatedSubscriptionsResponseDto })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(subscriptionQuerySchema))
    query: SubscriptionQueryDto,
  ): Promise<PaginatedSubscriptionsResponseDto> {
    return this.subscriptionsService.findMine(user.userId, tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.CLIENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Detalhes de uma assinatura' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Assinatura não encontrada' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.findOne(tenantId, id, user);
  }

  @Patch(':id/manual/:action')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Ativar, suspender ou renovar pela equipe (pagamento no balcão ou atraso)',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'action', enum: ['activate', 'suspend', 'renew'] })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async manual(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action', new ZodValidationPipe(manualActionSchema))
    action: ManualAction,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService[action](tenantId, id);
  }

  @Patch(':id/activate')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @ApiSecurity('internal-api-key')
  @ApiHeader({ name: 'X-Internal-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiOperation({ summary: 'Ativar assinatura (módulo de pagamentos)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async activate(
    @TenantHeader() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.activate(tenantId, id);
  }

  @Patch(':id/suspend')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @ApiSecurity('internal-api-key')
  @ApiHeader({ name: 'X-Internal-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiOperation({ summary: 'Suspender assinatura (pagamento atrasado)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async suspend(
    @TenantHeader() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.suspend(tenantId, id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.CLIENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cancelar assinatura' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.cancel(tenantId, id, user);
  }

  @Patch(':id/renew')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @ApiSecurity('internal-api-key')
  @ApiHeader({ name: 'X-Internal-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiOperation({ summary: 'Renovar ciclo de cobrança' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async renew(
    @TenantHeader() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.renew(tenantId, id);
  }
}
