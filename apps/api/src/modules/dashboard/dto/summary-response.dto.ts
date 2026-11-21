import { ApiProperty } from '@nestjs/swagger';

export class BarberAppointmentCountDto {
  @ApiProperty({ nullable: true })
  barberId!: string | null;

  @ApiProperty()
  barberName!: string;

  @ApiProperty()
  count!: number;
}

export class AppointmentsByDayDto {
  @ApiProperty({ example: '2026-11-19', description: 'Dia local AAAA-MM-DD' })
  date!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty({ description: 'Soma de totalPrice dos finalizados no dia' })
  revenue!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ enum: ['today', 'week', '7d', 'month', 'year'] })
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
    description:
      'Finalizados no mesmo trecho do período anterior (ontem até a mesma hora, mês anterior até o mesmo dia)',
  })
  previousTotalAppointments!: number;

  @ApiProperty({
    type: [AppointmentsByDayDto],
    description: 'Um item por dia do período, vazio para year',
  })
  appointmentsByDay!: AppointmentsByDayDto[];

  @ApiProperty({
    description: 'Taxa de ocupação (atendimentos / horas abertas)',
  })
  occupancyRate!: number;
}
