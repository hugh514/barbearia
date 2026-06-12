import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { ChannelMessageHandlerService } from '@modules/channels/channel-message-handler.service';
import { ChannelConfigService } from '@modules/channel-config/channel-config.service';
import {
  INSTAGRAM_GRAPH_PROVIDER,
  InstagramGraphProvider,
} from './providers/instagram-graph.provider';

export interface InstagramWebhookEntry {
  id?: string;
  messaging?: Array<{
    sender?: { id?: string };
    recipient?: { id?: string };
    timestamp?: number;
    message?: {
      mid?: string;
      text?: string;
    };
  }>;
}

export interface InstagramWebhookPayload {
  object?: string;
  entry?: InstagramWebhookEntry[];
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly channelConfigService: ChannelConfigService,
    @Inject(forwardRef(() => ChannelMessageHandlerService))
    private readonly channelMessageHandler: ChannelMessageHandlerService,
    @Inject(INSTAGRAM_GRAPH_PROVIDER)
    private readonly instagramGraph: InstagramGraphProvider,
  ) {}

  verifyChallenge(
    mode: string | undefined,
    verifyToken: string | undefined,
    challenge: string | undefined,
  ): string {
    if (mode !== 'subscribe' || !verifyToken || !challenge) {
      throw new BadRequestException('Invalid verification request');
    }

    const result = this.instagramGraph.verifyChallenge(verifyToken, challenge);
    if (!result) {
      throw new BadRequestException('Verification token mismatch');
    }

    return result;
  }

  async handleWebhook(payload: InstagramWebhookPayload): Promise<void> {
    if (payload.object !== 'instagram' && payload.object !== 'page') {
      return;
    }

    for (const entry of payload.entry ?? []) {
      const pageId = entry.id;
      if (!pageId) {
        continue;
      }

      const config =
        await this.channelConfigService.findByInstagramPageId(pageId);
      if (!config) {
        this.logger.warn(
          `Webhook rejected: no tenant configured for Instagram page ${pageId}`,
        );
        throw new NotFoundException('Webhook not accepted');
      }

      for (const event of entry.messaging ?? []) {
        if (!event.message?.text || !event.sender?.id) {
          continue;
        }

        await this.channelMessageHandler.handleInbound({
          tenantId: config.tenantId,
          channel: ConversationChannel.INSTAGRAM,
          instagramId: event.sender.id,
          content: event.message.text,
          externalId: event.message.mid,
        });
      }
    }
  }

  async sendMessage(params: {
    pageId: string | null | undefined;
    recipientId: string;
    text: string;
  }): Promise<void> {
    if (!params.pageId) {
      throw new BadRequestException('Instagram page is not configured');
    }

    await this.instagramGraph.sendMessage({
      pageId: params.pageId,
      recipientId: params.recipientId,
      text: params.text,
    });
  }
}
