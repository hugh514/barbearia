import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from '@common/pagination/pagination.types';

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  perPage!: number;

  @ApiProperty()
  lastPage!: number;
}
