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
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { InternalApiKeyGuard } from '@common/guards/internal-api-key.guard';
import { TenantHeader } from '@common/decorators/tenant-header.decorator';
import { paginationQuerySchema } from '@common/pagination/pagination-query.schema';
import { Public } from '@modules/auth/decorators/public.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import {
  CreateCustomerDto,
  createCustomerSchema,
} from '@modules/customers/dto/create-customer.dto';
import {
  CustomerQueryDto,
  customerQuerySchema,
} from '@modules/customers/dto/customer-query.dto';
import {
  CustomerProfileResponseDto,
  CustomerResponseDto,
  PaginatedConversationsResponseDto,
  PaginatedCustomersResponseDto,
  PaginatedHistoryResponseDto,
  UpsertCustomerResponseDto,
} from '@modules/customers/dto/customer-response.dto';
import {
  UpdateCustomerDto,
  updateCustomerSchema,
} from '@modules/customers/dto/update-customer.dto';
import {
  UpsertCustomerDto,
  upsertCustomerSchema,
} from '@modules/customers/dto/upsert-customer.dto';
import { CustomersService } from '@modules/customers/customers.service';
import { PaginatedPaymentsResponseDto } from '@modules/payments/dto/payment-response.dto';
import { PaymentsService } from '@modules/payments/payments.service';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cadastro manual de cliente' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  @ApiResponse({ status: 409, description: 'Telefone duplicado no tenant' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(tenantId, body);
  }

  @Post('upsert')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @ApiSecurity('internal-api-key')
  @ApiHeader({ name: 'X-Internal-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiOperation({
    summary: 'CRM automático — upsert por telefone (API interna)',
  })
  @ApiBody({ type: UpsertCustomerDto })
  @ApiResponse({ status: 201, type: UpsertCustomerResponseDto })
  async upsert(
    @TenantHeader() tenantId: string,
    @Body(new ZodValidationPipe(upsertCustomerSchema)) body: UpsertCustomerDto,
  ): Promise<UpsertCustomerResponseDto> {
    return this.customersService.upsert(tenantId, body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Buscar clientes por nome, telefone ou Instagram' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedCustomersResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(customerQuerySchema)) query: CustomerQueryDto,
  ): Promise<PaginatedCustomersResponseDto> {
    return this.customersService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Perfil completo do cliente' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: CustomerProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado no tenant' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerProfileResponseDto> {
    return this.customersService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualização parcial do cliente' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 409, description: 'Telefone duplicado' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(tenantId, id, body);
  }

  @Get(':id/payments')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Histórico financeiro do cliente' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedPaymentsResponseDto })
  async getPayments(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: { page: number; perPage: number },
  ): Promise<PaginatedPaymentsResponseDto> {
    return this.paymentsService.findByCustomer(
      tenantId,
      id,
      query.page,
      query.perPage,
    );
  }

  @Get(':id/history')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Histórico de atendimentos do cliente' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedHistoryResponseDto })
  async getHistory(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: { page: number; perPage: number },
  ): Promise<PaginatedHistoryResponseDto> {
    return this.customersService.getHistory(
      tenantId,
      id,
      query.page,
      query.perPage,
    );
  }

  @Get(':id/conversations')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Conversas do cliente' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedConversationsResponseDto })
  async getConversations(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: { page: number; perPage: number },
  ): Promise<PaginatedConversationsResponseDto> {
    return this.customersService.getConversations(
      tenantId,
      id,
      query.page,
      query.perPage,
    );
  }
}
