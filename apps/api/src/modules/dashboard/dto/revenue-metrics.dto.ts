import { ApiProperty } from '@nestjs/swagger';

export class BarberRevenueDto {
  @ApiProperty({ nullable: true })
  barberId!: string | null;

  @ApiProperty()
  barberName!: string;

  @ApiProperty()
  revenue!: number;

  @ApiProperty()
  appointmentCount!: number;
}

export class RevenueMetricsResponseDto {
  @ApiProperty({ enum: ['today', 'week', 'month', 'year'] })
  period!: string;

  @ApiProperty()
  appointmentRevenue!: number;

  @ApiProperty()
  planRevenue!: number;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty({
    description: 'Percentual de crescimento vs período anterior',
    nullable: true,
  })
  growthPercent!: number | null;

  @ApiProperty({ type: [BarberRevenueDto] })
  revenueByBarber!: BarberRevenueDto[];
}
