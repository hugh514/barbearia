import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { InternalApiKeyGuard } from '@common/guards/internal-api-key.guard';
import { TenantHeader } from '@common/decorators/tenant-header.decorator';
import { Public } from '@modules/auth/decorators/public.decorator';
import { WhatsAppSendDto, whatsAppSendSchema } from './dto/whatsapp-send.dto';
import { EvolutionWebhookPayload, WhatsAppService } from './whatsapp.service';

@ApiTags('channels')
@Controller('channels/whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('webhook')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 100, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook Evolution API — receber mensagens WhatsApp',
  })
  @ApiHeader({ name: 'apikey', required: true })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  @ApiResponse({ status: 401, description: 'API key inválida' })
  async webhook(
    @Headers('apikey') headerApiKey: string | undefined,
    @Body() payload: EvolutionWebhookPayload,
  ): Promise<{ ok: true }> {
    // Accept apikey from header (Evolution API) or fallback to payload.apikey
    const apiKey = headerApiKey ?? payload.apikey;
    if (!this.whatsAppService.verifyWebhook(apiKey)) {
      throw new UnauthorizedException('Webhook not accepted');
    }
    await this.whatsAppService.handleWebhook(payload);
    return { ok: true };
  }

  @Post('send')
  @Public()
  @UseGuards(InternalApiKeyGuard)
  @ApiSecurity('internal-api-key')
  @ApiHeader({ name: 'X-Internal-Key', required: true })
  @ApiHeader({ name: 'X-Tenant-Id', required: true })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Envio ativo de mensagem WhatsApp (API interna)' })
  @ApiBody({ type: WhatsAppSendDto })
  @ApiResponse({ status: 202, description: 'Mensagem enviada' })
  async send(
    @TenantHeader() tenantId: string,
    @Body(new ZodValidationPipe(whatsAppSendSchema)) body: WhatsAppSendDto,
  ): Promise<{ ok: true }> {
    await this.whatsAppService.send({
      tenantId,
      phone: body.phone,
      message: body.message,
      conversationId: body.conversationId,
    });
    return { ok: true };
  }
}
