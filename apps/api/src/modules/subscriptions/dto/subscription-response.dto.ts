import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { PaginationMetaDto } from '@common/pagination/pagination-meta.dto';

export class SubscriptionPlanDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  priceCents!: number;

  @ApiProperty()
  intervalDays!: number;

  @ApiProperty({ type: [String] })
  benefits!: string[];
}

export class SubscriptionCustomerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  nextBillingAt?: Date | null;

  @ApiPropertyOptional()
  cancelledAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: SubscriptionPlanDto })
  plan?: SubscriptionPlanDto;

  @ApiPropertyOptional({ type: SubscriptionCustomerDto })
  customer?: SubscriptionCustomerDto;
}

export class PaginatedSubscriptionsResponseDto {
  @ApiProperty({ type: [SubscriptionResponseDto] })
  data!: SubscriptionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
