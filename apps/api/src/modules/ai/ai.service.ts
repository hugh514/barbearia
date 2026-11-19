import { Inject, Injectable } from '@nestjs/common';
import {
  ChannelConfig,
  Customer,
  Message,
  MessageDirection,
} from '@prisma/client';
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
  /** Conversation history, oldest-first. Injected by the caller — the AI layer
   *  never touches the database directly (constitution, Artigo IV). */
  history: Message[];
  newMessage: string;
}

export interface ProcessMessageResult extends ParsedAiResponse {
  actions: AiAction[];
}

/** Neutralize user-controlled text before embedding it in a system prompt, to
 *  prevent prompt injection (e.g. a customer name containing fake instructions). */
function sanitizeForPrompt(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/["\\]/g, '')
    .replace(/[[\]]/g, '')
    .trim()
    .slice(0, 120);
}

@Injectable()
export class AiService {
  constructor(
    @Inject(OPENAI_PROVIDER)
    private readonly openAi: OpenAiProvider,
  ) {}

  async processMessage(
    input: ProcessMessageInput,
  ): Promise<ProcessMessageResult> {
    const history = input.history;
    const systemPrompt = buildSystemPrompt(input.config);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'system',
        content: `Dados do cliente: nome="${sanitizeForPrompt(input.customer.name)}", telefone="${sanitizeForPrompt(input.customer.phone)}"`,
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
}
