import { Inject, Injectable } from '@nestjs/common';
import {
  ChannelConfig,
  Customer,
  Message,
  MessageDirection,
} from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { buildSystemPrompt } from './prompt-builder';
import {
  OPENAI_PROVIDER,
  OpenAiProvider,
  ChatMessage,
} from './providers/openai.provider';
import { AiAction, ParsedAiResponse, parseAiResponse } from './response-parser';

export interface ProcessMessageInput {
  config: ChannelConfig;
  customer: Customer;
  tenantId: string;
  conversationId: string;
  newMessage: string;
}

export interface ProcessMessageResult extends ParsedAiResponse {
  actions: AiAction[];
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_PROVIDER)
    private readonly openAi: OpenAiProvider,
  ) {}

  async processMessage(
    input: ProcessMessageInput,
  ): Promise<ProcessMessageResult> {
    const history = await this.getRecentMessages(
      input.tenantId,
      input.conversationId,
      10,
    );
    const systemPrompt = buildSystemPrompt(input.config);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'system',
        content: `Dados do cliente: nome="${input.customer.name}", telefone="${input.customer.phone}"`,
      },
      ...history.map((message) => ({
        role:
          message.direction === MessageDirection.INBOUND
            ? ('user' as const)
            : ('assistant' as const),
        content: message.content,
      })),
      { role: 'user', content: input.newMessage },
    ];

    const rawResponse = await this.openAi.createChatCompletion(messages);
    return parseAiResponse(rawResponse);
  }

  private async getRecentMessages(
    tenantId: string,
    conversationId: string,
    limit: number,
  ): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { tenantId, conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }
}
