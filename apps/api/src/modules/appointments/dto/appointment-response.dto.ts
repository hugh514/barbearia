import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { PaginationMetaDto } from '@modules/customers/dto/customer-response.dto';

export class AppointmentCustomerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;
}

export class AppointmentBarberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AppointmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiPropertyOptional()
  barberId?: string | null;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty({ type: [String] })
  services!: string[];

  @ApiPropertyOptional()
  totalPrice?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  cancelReason?: string | null;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  finishedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: AppointmentCustomerDto })
  customer?: AppointmentCustomerDto;

  @ApiPropertyOptional({ type: AppointmentBarberDto })
  barber?: AppointmentBarberDto | null;

  @ApiPropertyOptional({
    description: 'Tempo de espera em segundos (fila do dia)',
  })
  waitTimeSeconds?: number;

  @ApiPropertyOptional({
    description: 'Duração do atendimento em segundos (histórico)',
  })
  durationSeconds?: number | null;
}

export class PaginatedAppointmentsResponseDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  data!: AppointmentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class QueueAppointmentsResponseDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  data!: AppointmentResponseDto[];
}
