import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { CheckinResponseDto } from '@modules/checkin/dto/checkin-response.dto';
import {
  ConsumeTokenDto,
  consumeTokenSchema,
} from '@modules/checkin/dto/consume-token.dto';
import { GenerateTokenResponseDto } from '@modules/checkin/dto/generate-token-response.dto';
import { CheckinService } from '@modules/checkin/checkin.service';

@ApiTags('checkin')
@Controller('checkin')
@ApiBearerAuth('access-token')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('token')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.CLIENTE)
  @Throttle({ checkin: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Gerar token efêmero de check-in (QR Code)' })
  @ApiResponse({ status: 201, type: GenerateTokenResponseDto })
  @ApiResponse({ status: 403, description: 'Permissão insuficiente' })
  @ApiResponse({
    status: 422,
    description: 'Usuário sem cadastro de cliente vinculado',
  })
  async generateToken(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GenerateTokenResponseDto> {
    return this.checkinService.generateToken(user.userId, tenantId);
  }

  @Post('consume')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @Throttle({ checkin: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Consumir token de check-in e entrar na fila' })
  @ApiBody({ type: ConsumeTokenDto })
  @ApiResponse({ status: 200, type: CheckinResponseDto })
  @ApiResponse({ status: 404, description: 'Token inválido ou expirado' })
  @ApiResponse({
    status: 422,
    description: 'Cliente não encontrado ou inativo',
  })
  async consumeToken(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(consumeTokenSchema)) body: ConsumeTokenDto,
  ): Promise<CheckinResponseDto> {
    return this.checkinService.consumeToken(body.token, tenantId);
  }
}
