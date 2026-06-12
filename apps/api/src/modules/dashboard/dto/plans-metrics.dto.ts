import { ApiProperty } from '@nestjs/swagger';

export class PlansMetricsResponseDto {
  @ApiProperty()
  activeSubscribers!: number;

  @ApiProperty()
  cancellationsInPeriod!: number;

  @ApiProperty({ description: 'Monthly Recurring Revenue em centavos' })
  mrrCents!: number;

  @ApiProperty({ description: 'Taxa de churn (cancelados / ativos)' })
  churnRate!: number;
}
