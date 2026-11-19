import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelServiceItemDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: string;
}

/** O que o CLIENTE e o layout dos fronts podem ver. */
export class ChannelConfigPublicDto {
  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  workingHours!: string;

  @ApiProperty({ type: [ChannelServiceItemDto] })
  services!: ChannelServiceItemDto[];

  @ApiProperty({ example: '#1F4FB8' })
  brandColor!: string;

  @ApiProperty({ enum: ['light', 'dark'] })
  themeMode!: 'light' | 'dark';
}

export class ChannelAppearanceDto {
  @ApiProperty({ nullable: true })
  businessName!: string | null;

  @ApiProperty({ example: '#1F4FB8' })
  brandColor!: string;

  @ApiProperty({ enum: ['light', 'dark'] })
  themeMode!: 'light' | 'dark';
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

  @ApiProperty({ example: '#1F4FB8', description: 'Cor da marca, #RRGGBB' })
  brandColor!: string;

  @ApiProperty({ enum: ['light', 'dark'] })
  themeMode!: 'light' | 'dark';

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
