import { ApiProperty } from '@nestjs/swagger';

export class BarberPerformanceDto {
  @ApiProperty()
  barberId!: string;

  @ApiProperty()
  barberName!: string;

  @ApiProperty()
  totalAppointments!: number;

  @ApiProperty({
    description: 'Tempo médio de atendimento em minutos',
    nullable: true,
  })
  averageServiceTimeMinutes!: number | null;

  @ApiProperty()
  revenue!: number;

  @ApiProperty({
    description: 'Avaliação média (null quando módulo de reviews não existir)',
    nullable: true,
  })
  averageRating!: number | null;
}

export class BarbersMetricsResponseDto {
  @ApiProperty({ type: [BarberPerformanceDto] })
  barbers!: BarberPerformanceDto[];
}
