import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { ChannelConfigService } from './channel-config.service';
import {
  CreateChannelConfigDto,
  createChannelConfigSchema,
} from './dto/create-config.dto';
import {
  ChannelAppearanceDto,
  ChannelConfigPublicDto,
  ChannelConfigResponseDto,
} from './dto/config-response.dto';
import {
  UpdateChannelConfigDto,
  updateChannelConfigSchema,
} from './dto/update-config.dto';

@ApiTags('channels')
@Controller('channels/config')
export class ChannelConfigController {
  constructor(private readonly channelConfigService: ChannelConfigService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar ou substituir configuração do bot' })
  @ApiBody({ type: CreateChannelConfigDto })
  @ApiResponse({ status: 201, type: ChannelConfigResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createChannelConfigSchema))
    body: CreateChannelConfigDto,
  ): Promise<ChannelConfigResponseDto> {
    return this.channelConfigService.create(tenantId, body);
  }

  @Get('appearance')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO, UserRole.CLIENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Aparência da barbearia (qualquer papel; padrões se não há config)',
  })
  @ApiResponse({ status: 200, type: ChannelAppearanceDto })
  async appearance(
    @CurrentTenant() tenantId: string,
  ): Promise<ChannelAppearanceDto> {
    return this.channelConfigService.findAppearance(tenantId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO, UserRole.CLIENTE)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Obter configuração do tenant (CLIENTE recebe só a lista permitida; 404 para a equipe se não existe)',
  })
  @ApiResponse({ status: 200, type: ChannelConfigResponseDto })
  async findOne(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChannelConfigResponseDto | ChannelConfigPublicDto> {
    if (user.role === UserRole.CLIENTE) {
      return this.channelConfigService.findPublic(tenantId);
    }
    return this.channelConfigService.findOne(tenantId);
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar parcialmente configuração do bot' })
  @ApiBody({ type: UpdateChannelConfigDto })
  @ApiResponse({ status: 200, type: ChannelConfigResponseDto })
  async update(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(updateChannelConfigSchema))
    body: UpdateChannelConfigDto,
  ): Promise<ChannelConfigResponseDto> {
    return this.channelConfigService.update(tenantId, body);
  }
}
