import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHash, timingSafeEqual } from 'crypto';
import { Env } from '@common/config/env.schema';

export const EVOLUTION_API_PROVIDER = Symbol('EVOLUTION_API_PROVIDER');

export interface SendTextParams {
  instance: string;
  phone: string;
  text: string;
}

export interface EvolutionApiProvider {
  sendText(params: SendTextParams): Promise<void>;
  verifyWebhook(apiKey?: string): boolean;
}

@Injectable()
export class EvolutionApiClient implements EvolutionApiProvider {
  private readonly http: AxiosInstance;
  private readonly apiKey: string;
  private readonly logger = new Logger(EvolutionApiClient.name);

  constructor(private readonly configService: ConfigService<Env, true>) {
    const baseURL = this.configService.get('EVOLUTION_API_URL', {
      infer: true,
    });
    this.apiKey = this.configService.get('EVOLUTION_API_KEY', { infer: true });

    if (!this.apiKey) {
      this.logger.warn(
        'EVOLUTION_API_KEY is not set — all incoming webhooks will be rejected (fail-closed)',
      );
    }

    this.http = axios.create({
      baseURL,
      timeout: 15_000,
      headers: this.apiKey ? { apikey: this.apiKey } : {},
    });
  }

  verifyWebhook(apiKey?: string): boolean {
    // Fail-closed: no configured key → reject everything
    if (!this.apiKey || !apiKey) {
      return false;
    }

    // Timing-safe comparison via SHA-256 digests to prevent timing attacks
    const expected = createHash('sha256').update(this.apiKey).digest();
    const received = createHash('sha256').update(apiKey).digest();

    try {
      return timingSafeEqual(expected, received);
    } catch {
      return false;
    }
  }

  async sendText(params: SendTextParams): Promise<void> {
    const number = params.phone.replace(/\D/g, '');

    await this.http.post(`/message/sendText/${params.instance}`, {
      number,
      text: params.text,
    });
  }
}
