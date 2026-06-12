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
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { ChannelConfigService } from './channel-config.service';
import {
  CreateChannelConfigDto,
  createChannelConfigSchema,
} from './dto/create-config.dto';
import { ChannelConfigResponseDto } from './dto/config-response.dto';
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

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obter configuração do bot do tenant' })
  @ApiResponse({ status: 200, type: ChannelConfigResponseDto })
  async findOne(
    @CurrentTenant() tenantId: string,
  ): Promise<ChannelConfigResponseDto> {
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
