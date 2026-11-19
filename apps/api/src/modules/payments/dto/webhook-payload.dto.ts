import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookDataDto {
  @ApiProperty()
  id!: string;
}

export class WebhookPayloadDto {
  @ApiPropertyOptional()
  action?: string;

  @ApiPropertyOptional()
  type?: string;

  @ApiPropertyOptional({ type: WebhookDataDto })
  data?: WebhookDataDto;
}
