import { ApiProperty } from '@nestjs/swagger';

export class TopCustomerDto {
  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty()
  visitCount!: number;
}

export class CustomersMetricsResponseDto {
  @ApiProperty()
  totalCustomers!: number;

  @ApiProperty()
  newCustomersInPeriod!: number;

  @ApiProperty()
  recurringCustomers!: number;

  @ApiProperty({ type: [TopCustomerDto] })
  topCustomersByFrequency!: TopCustomerDto[];
}
