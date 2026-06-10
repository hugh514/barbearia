import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { paginationQuerySchema } from '@common/pagination/pagination-query.schema';
import { Public } from '@modules/auth/decorators/public.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import {
  CreateMessageDto,
  createMessageSchema,
} from '@modules/messages/dto/create-message.dto';
import {
  CreateMessageResponseDto,
  PaginatedMessagesResponseDto,
} from '@modules/messages/dto/message-response.dto';
import { MessagesService } from '@modules/messages/messages.service';

@ApiTags('messages')
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity('internal-api-key')
  @ApiHeader({ name: 'X-Internal-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @ApiOperation({ summary: 'Registrar mensagem recebida ou enviada' })
  @ApiParam({ name: 'conversationId', type: String })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({ status: 201, type: CreateMessageResponseDto })
  async create(
    @TenantHeader() tenantId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body(new ZodValidationPipe(createMessageSchema)) body: CreateMessageDto,
  ): Promise<CreateMessageResponseDto> {
    return this.messagesService.create(tenantId, conversationId, body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Listar mensagens da conversa (mais recentes primeiro)',
  })
  @ApiParam({ name: 'conversationId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedMessagesResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Conversa não encontrada no tenant',
  })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: { page: number; perPage: number },
  ): Promise<PaginatedMessagesResponseDto> {
    return this.messagesService.findAll(
      tenantId,
      conversationId,
      query.page,
      query.perPage,
    );
  }
}
