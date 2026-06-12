import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Env } from '@common/config/env.schema';

export const OPENAI_PROVIDER = Symbol('OPENAI_PROVIDER');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAiProvider {
  createChatCompletion(messages: ChatMessage[]): Promise<string>;
}

@Injectable()
export class OpenAiClient implements OpenAiProvider {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    const apiKey = this.configService.get('OPENAI_API_KEY', { infer: true });
    this.model = this.configService.get('OPENAI_MODEL', { infer: true });
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async createChatCompletion(messages: ChatMessage[]): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    return content;
  }
}
