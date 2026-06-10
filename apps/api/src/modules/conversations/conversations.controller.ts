import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { InternalApiKeyGuard } from '@common/guards/internal-api-key.guard';
import { TenantHeader } from '@common/decorators/tenant-header.decorator';
import { Public } from '@modules/auth/decorators/public.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import {
  CreateConversationDto,
  createConversationSchema,
} from '@modules/conversations/dto/create-conversation.dto';
import {
  ConversationQueryDto,
  conversationQuerySchema,
} from '@modules/conversations/dto/conversation-query.dto';
import {
  ConversationResponseDto,
  ConversationStatsResponseDto,
  PaginatedConversationsListResponseDto,
} from '@modules/conversations/dto/conversation-response.dto';
import {
  UpdateStatusDto,
  updateStatusSchema,
} from '@modules/conversations/dto/update-status.dto';
import { ConversationsService } from '@modules/conversations/conversations.service';

@ApiTags(
  'conversations — Socket.IO namespace /conversations; eventos: conversation.updated, message.new (room tenant:{tenantId}, auth JWT)',
)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity('internal-api-key')
  @ApiHeader({ name: 'X-Internal-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiOperation({
    summary: 'Criar conversa (ou reutilizar conversa ativa no canal)',
  })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  async create(
    @TenantHeader() tenantId: string,
    @Body(new ZodValidationPipe(createConversationSchema))
    body: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.create(tenantId, body);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Totais de conversas por status' })
  @ApiResponse({ status: 200, type: ConversationStatsResponseDto })
  async getStats(
    @CurrentTenant() tenantId: string,
  ): Promise<ConversationStatsResponseDto> {
    return this.conversationsService.getStats(tenantId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar conversas do backoffice' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedConversationsListResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(conversationQuerySchema))
    query: ConversationQueryDto,
  ): Promise<PaginatedConversationsListResponseDto> {
    return this.conversationsService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Detalhes da conversa' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Conversa não encontrada no tenant',
  })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar status e atribuição da conversa' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para fechar conversa',
  })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.updateStatus(tenantId, id, body, user);
  }
}
