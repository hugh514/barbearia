import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Public } from '@modules/auth/decorators/public.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import {
  CreatePaymentDto,
  createPaymentSchema,
} from '@modules/payments/dto/create-payment.dto';
import {
  PaymentQueryDto,
  paymentQuerySchema,
} from '@modules/payments/dto/payment-query.dto';
import {
  PaginatedPaymentsResponseDto,
  PaymentResponseDto,
} from '@modules/payments/dto/payment-response.dto';
import { WebhookPayloadDto } from '@modules/payments/dto/webhook-payload.dto';
import { PaymentsService } from '@modules/payments/payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.CLIENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar cobrança no gateway de pagamento' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Já existe pagamento pendente para a assinatura',
  })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.create(tenantId, user, body);
  }

  @Post(':id/mock-approve')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.CLIENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Aprovar pagamento fictício (só com PAYMENTS_PROVIDER=mock e fora de produção)',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Pagamento inexistente ou provedor real',
  })
  async mockApprove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.mockApprove(tenantId, id, user);
  }

  @Post('webhook')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 100, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de notificação do Mercado Pago' })
  @ApiHeader({ name: 'x-signature', required: true })
  @ApiHeader({ name: 'x-request-id', required: true })
  @ApiQuery({ name: 'data.id', required: false, type: String })
  @ApiBody({ type: WebhookPayloadDto })
  @ApiResponse({ status: 200, description: 'Notificação recebida' })
  @ApiResponse({ status: 401, description: 'Assinatura HMAC inválida' })
  async handleWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, string | string[] | undefined>,
    @Body() body: WebhookPayloadDto,
  ): Promise<{ received: boolean }> {
    return this.paymentsService.handleWebhook(headers, query, body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar pagamentos com filtros' })
  @ApiQuery({ name: 'subscriptionId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedPaymentsResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(paymentQuerySchema)) query: PaymentQueryDto,
  ): Promise<PaginatedPaymentsResponseDto> {
    return this.paymentsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.CLIENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Detalhes de um pagamento' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.findOne(tenantId, id, user);
  }
}
