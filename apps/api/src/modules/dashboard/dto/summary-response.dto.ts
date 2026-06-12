import { ApiProperty } from '@nestjs/swagger';

export class BarberAppointmentCountDto {
  @ApiProperty({ nullable: true })
  barberId!: string | null;

  @ApiProperty()
  barberName!: string;

  @ApiProperty()
  count!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ enum: ['today', 'week', 'month', 'year'] })
  period!: string;

  @ApiProperty()
  totalAppointments!: number;

  @ApiProperty({ type: [BarberAppointmentCountDto] })
  appointmentsByBarber!: BarberAppointmentCountDto[];

  @ApiProperty()
  newCustomers!: number;

  @ApiProperty()
  revenue!: number;

  @ApiProperty({
    description: 'Taxa de ocupação (atendimentos / horas abertas)',
  })
  occupancyRate!: number;
}
