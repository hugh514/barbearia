import { ApiProperty } from '@nestjs/swagger';

export class GenerateTokenResponseDto {
  @ApiProperty({ description: 'Token efêmero de check-in (64 chars hex)' })
  token!: string;

  @ApiProperty({ description: 'TTL do token em segundos', example: 60 })
  expiresInSeconds!: number;
}
