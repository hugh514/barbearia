import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaginationMetaDto } from '@common/pagination/pagination-meta.dto';

export class PaymentPlanDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  priceCents!: number;
}

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  subscriptionId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiPropertyOptional()
  externalId?: string | null;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty()
  amountCents!: number;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional()
  paymentUrl?: string | null;

  @ApiPropertyOptional()
  qrCode?: string | null;

  @ApiPropertyOptional({ type: Object })
  gatewayData?: unknown;

  @ApiPropertyOptional()
  paidAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: PaymentPlanDto })
  plan?: PaymentPlanDto;
}

export class PaginatedPaymentsResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  data!: PaymentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
