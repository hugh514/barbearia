import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Env } from '@common/config/env.schema';

export const INSTAGRAM_GRAPH_PROVIDER = Symbol('INSTAGRAM_GRAPH_PROVIDER');

export interface SendInstagramMessageParams {
  pageId: string;
  recipientId: string;
  text: string;
}

export interface InstagramGraphProvider {
  sendMessage(params: SendInstagramMessageParams): Promise<void>;
  verifyChallenge(verifyToken: string, challenge: string): string | null;
  verifySignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean;
}

@Injectable()
export class InstagramGraphClient implements InstagramGraphProvider {
  private readonly http: AxiosInstance;
  private readonly pageAccessToken: string;
  private readonly verifyToken: string;
  private readonly appSecret: string;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.pageAccessToken = this.configService.get(
      'INSTAGRAM_PAGE_ACCESS_TOKEN',
      {
        infer: true,
      },
    );
    this.verifyToken = this.configService.get('INSTAGRAM_VERIFY_TOKEN', {
      infer: true,
    });
    this.appSecret = this.configService.get('INSTAGRAM_APP_SECRET', {
      infer: true,
    });

    this.http = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      timeout: 15_000,
    });
  }

  verifyChallenge(verifyToken: string, challenge: string): string | null {
    // Timing-safe comparison to prevent timing oracle on verify token
    const expected = createHash('sha256').update(this.verifyToken).digest();
    const received = createHash('sha256').update(verifyToken).digest();

    try {
      if (timingSafeEqual(expected, received)) {
        return challenge;
      }
    } catch {
      // buffers of different length — mismatch
    }

    return null;
  }

  verifySignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader) {
      return false;
    }

    // Expected format: "sha256=<hex>"
    const prefix = 'sha256=';
    if (!signatureHeader.startsWith(prefix)) {
      return false;
    }

    const receivedHex = signatureHeader.slice(prefix.length);

    const hmac = createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return timingSafeEqual(
        Buffer.from(hmac, 'hex'),
        Buffer.from(receivedHex, 'hex'),
      );
    } catch {
      // Different length hex strings → mismatch
      return false;
    }
  }

  async sendMessage(params: SendInstagramMessageParams): Promise<void> {
    await this.http.post(
      `/${params.pageId}/messages`,
      {
        recipient: { id: params.recipientId },
        message: { text: params.text },
      },
      {
        params: {
          access_token: this.pageAccessToken,
        },
      },
    );
  }
}
