import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConversationChannel, UserRole } from '@prisma/client';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { CurrentTenant } from '@modules/auth/decorators/current-tenant.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@modules/auth/auth.types';
import { ChannelsReplyService } from './channels-reply.service';
import { ChannelReplyDto, channelReplySchema } from './dto/channel-reply.dto';
import { ParseChannelPipe } from './pipes/parse-channel.pipe';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsReplyService: ChannelsReplyService) {}

  @Post(':channel/reply')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.GERENTE, UserRole.BARBEIRO)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Responder mensagem pelo backoffice' })
  @ApiParam({ name: 'channel', enum: ConversationChannel })
  @ApiBody({ type: ChannelReplyDto })
  @ApiResponse({ status: 201, description: 'Mensagem enviada e registrada' })
  async reply(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('channel', ParseChannelPipe) channel: ConversationChannel,
    @Body(new ZodValidationPipe(channelReplySchema)) body: ChannelReplyDto,
  ): Promise<{ ok: true }> {
    await this.channelsReplyService.reply({
      tenantId,
      userId: user.userId,
      channel,
      conversationId: body.conversationId,
      message: body.message,
    });
    return { ok: true };
  }
}
