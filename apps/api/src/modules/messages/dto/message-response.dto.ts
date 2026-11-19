import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationChannel, MessageDirection } from '@prisma/client';
import { PaginationMetaDto } from '@common/pagination/pagination-meta.dto';

export class MessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: MessageDirection })
  direction!: MessageDirection;

  @ApiProperty({ enum: ConversationChannel })
  channel!: ConversationChannel;

  @ApiPropertyOptional()
  externalId?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class CreateMessageResponseDto extends MessageResponseDto {
  @ApiProperty({
    description:
      'ID da conversa efetiva (pode diferir do path se a original estava FECHADA)',
  })
  effectiveConversationId!: string;
}

export class PaginatedMessagesResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  data!: MessageResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
