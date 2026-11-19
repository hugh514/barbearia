import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '@modules/auth/decorators/public.decorator';
import { InstagramWebhookPayload, InstagramService } from './instagram.service';
import {
  INSTAGRAM_GRAPH_PROVIDER,
  InstagramGraphProvider,
} from './providers/instagram-graph.provider';

@ApiTags('channels')
@Controller('channels/instagram')
export class InstagramController {
  constructor(
    private readonly instagramService: InstagramService,
    @Inject(INSTAGRAM_GRAPH_PROVIDER)
    private readonly instagramGraph: InstagramGraphProvider,
  ) {}

  @Get('webhook')
  @Public()
  @ApiOperation({
    summary: 'Verificação de webhook Instagram (Meta challenge)',
  })
  @ApiQuery({ name: 'hub.mode', required: true })
  @ApiQuery({ name: 'hub.verify_token', required: true })
  @ApiQuery({ name: 'hub.challenge', required: true })
  @ApiResponse({ status: 200, description: 'Challenge retornado' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    return this.instagramService.verifyChallenge(mode, verifyToken, challenge);
  }

  @Post('webhook')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 100, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Instagram — receber DMs' })
  @ApiHeader({ name: 'x-hub-signature-256', required: true })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  @ApiResponse({ status: 401, description: 'Assinatura HMAC inválida' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() payload: InstagramWebhookPayload,
  ): Promise<{ ok: true }> {
    const rawBody = req.rawBody;
    if (!rawBody || !this.instagramGraph.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Webhook not accepted');
    }
    await this.instagramService.handleWebhook(payload);
    return { ok: true };
  }
}
