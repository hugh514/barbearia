import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelServiceItemDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: string;
}

export class ChannelConfigResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty({ type: [ChannelServiceItemDto] })
  services!: ChannelServiceItemDto[];

  @ApiProperty()
  address!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  workingHours!: string;

  @ApiPropertyOptional()
  rules?: string | null;

  @ApiPropertyOptional()
  whatsappInstance?: string | null;

  @ApiPropertyOptional()
  instagramPageId?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
