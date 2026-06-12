import { ApiProperty } from '@nestjs/swagger';

export class MessagesByChannelDto {
  @ApiProperty({ enum: ['WHATSAPP', 'INSTAGRAM'] })
  channel!: string;

  @ApiProperty()
  count!: number;
}

export class ConversationsMetricsResponseDto {
  @ApiProperty()
  openConversations!: number;

  @ApiProperty()
  waitingForHuman!: number;

  @ApiProperty({ type: [MessagesByChannelDto] })
  messagesByChannel!: MessagesByChannelDto[];

  @ApiProperty({
    description: 'Tempo médio de resposta em segundos',
    nullable: true,
  })
  averageResponseTimeSeconds!: number | null;
}
