import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '@common/pagination/pagination-meta.dto';

export class PlanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  priceCents!: number;

  @ApiProperty()
  intervalDays!: number;

  @ApiProperty({ type: [String] })
  benefits!: string[];

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedPlansResponseDto {
  @ApiProperty({ type: [PlanResponseDto] })
  data!: PlanResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
