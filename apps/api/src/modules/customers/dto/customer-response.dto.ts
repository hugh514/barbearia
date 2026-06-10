import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerOrigin, PlanStatus } from '@prisma/client';
import { PaginationMeta } from '@common/pagination/pagination.types';
import { ConversationResponseDto } from '@modules/conversations/dto/conversation-response.dto';

export class CustomerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  instagramId?: string | null;

  @ApiPropertyOptional()
  instagramUser?: string | null;

  @ApiProperty({ enum: CustomerOrigin })
  origin!: CustomerOrigin;

  @ApiProperty({ enum: PlanStatus })
  planStatus!: PlanStatus;

  @ApiPropertyOptional()
  lastVisit?: Date | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CustomerProfileResponseDto extends CustomerResponseDto {
  @ApiProperty({
    type: [Object],
    description: 'Últimos atendimentos (Feature 005)',
  })
  recentAppointments!: unknown[];

  @ApiPropertyOptional({ description: 'Plano ativo (Feature 006)' })
  activePlan!: unknown | null;
}

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

export class PaginatedCustomersResponseDto {
  @ApiProperty({ type: [CustomerResponseDto] })
  data!: CustomerResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class PaginatedHistoryResponseDto {
  @ApiProperty({ type: [Object], description: 'Atendimentos (Feature 005)' })
  data!: unknown[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class PaginatedConversationsResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  data!: ConversationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class UpsertCustomerResponseDto extends CustomerResponseDto {
  @ApiProperty({
    description: 'Indica se o cliente foi criado nesta requisição',
  })
  created!: boolean;
}
