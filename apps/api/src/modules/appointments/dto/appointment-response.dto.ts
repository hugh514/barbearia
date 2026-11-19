import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { PaginationMetaDto } from '@common/pagination/pagination-meta.dto';

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

  @ApiProperty({
    description: 'Horário de entrada na fila (check-in), igual a createdAt',
  })
  enteredAt!: Date;

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

export class MyQueuePositionResponseDto {
  @ApiProperty({
    nullable: true,
    description: '1 = próximo; 0 = em atendimento',
  })
  position!: number | null;

  @ApiProperty({ nullable: true, description: 'Pessoas aguardando na frente' })
  ahead!: number | null;

  @ApiProperty({ enum: AppointmentStatus, nullable: true })
  status!: AppointmentStatus | null;

  @ApiProperty({ nullable: true })
  enteredAt!: Date | null;
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
