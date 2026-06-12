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
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import {
  AppointmentQueryDto,
  appointmentQuerySchema,
} from '@modules/appointments/dto/appointment-query.dto';
import {
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
  QueueAppointmentsResponseDto,
} from '@modules/appointments/dto/appointment-response.dto';
import {
  CancelAppointmentDto,
  cancelAppointmentSchema,
} from '@modules/appointments/dto/cancel-appointment.dto';
import {
  CreateAppointmentDto,
  createAppointmentSchema,
} from '@modules/appointments/dto/create-appointment.dto';
import {
  FinishAppointmentDto,
  finishAppointmentSchema,
} from '@modules/appointments/dto/finish-appointment.dto';
import { AppointmentsService } from '@modules/appointments/appointments.service';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Registrar chegada do cliente na fila' })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiResponse({ status: 201, type: AppointmentResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado no tenant' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createAppointmentSchema))
    body: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.create(tenantId, body);
  }

  @Get('queue')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Fila do dia (AGUARDANDO + EM_ATENDIMENTO)' })
  @ApiResponse({ status: 200, type: QueueAppointmentsResponseDto })
  async getQueue(
    @CurrentTenant() tenantId: string,
  ): Promise<QueueAppointmentsResponseDto> {
    const data = await this.appointmentsService.getQueue(tenantId);
    return { data };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Histórico de atendimentos com filtros' })
  @ApiQuery({ name: 'barberId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedAppointmentsResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(appointmentQuerySchema))
    query: AppointmentQueryDto,
  ): Promise<PaginatedAppointmentsResponseDto> {
    return this.appointmentsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Detalhes de um atendimento' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findOne(tenantId, id);
  }

  @Patch(':id/start')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Iniciar atendimento' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 409, description: 'Barbeiro já está em atendimento' })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async start(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.start(tenantId, id, user.userId);
  }

  @Patch(':id/finish')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Finalizar atendimento' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: FinishAppointmentDto })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async finish(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(finishAppointmentSchema))
    body: FinishAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.finish(tenantId, id, body);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cancelar atendimento' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: CancelAppointmentDto })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  @ApiResponse({ status: 422, description: 'Transição de status inválida' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(cancelAppointmentSchema))
    body: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancel(tenantId, id, body);
  }
}
