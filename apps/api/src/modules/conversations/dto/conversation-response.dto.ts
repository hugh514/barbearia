import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConversationChannel,
  ConversationStatus,
  CustomerOrigin,
} from '@prisma/client';
import { PaginationMetaDto } from '@modules/customers/dto/customer-response.dto';

export class ConversationCustomerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  instagramUser?: string | null;

  @ApiProperty({ enum: CustomerOrigin })
  origin!: CustomerOrigin;
}

export class ConversationLastMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  direction!: string;

  @ApiProperty({ enum: ConversationChannel })
  channel!: ConversationChannel;

  @ApiProperty()
  createdAt!: Date;
}

export class ConversationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty({ enum: ConversationChannel })
  channel!: ConversationChannel;

  @ApiProperty({ enum: ConversationStatus })
  status!: ConversationStatus;

  @ApiPropertyOptional()
  assignedTo?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: ConversationCustomerDto })
  customer?: ConversationCustomerDto;

  @ApiPropertyOptional({ type: ConversationLastMessageDto })
  lastMessage?: ConversationLastMessageDto | null;
}

export class PaginatedConversationsListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  data!: ConversationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ConversationStatsResponseDto {
  @ApiProperty()
  aberta!: number;

  @ApiProperty()
  aguardando!: number;

  @ApiProperty()
  emAtendimento!: number;

  @ApiProperty()
  fechada!: number;

  @ApiProperty()
  total!: number;
}
