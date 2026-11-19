import {
  InstagramGraphProvider,
  SendInstagramMessageParams,
} from '../../src/modules/instagram/providers/instagram-graph.provider';

export interface SentInstagramMessage {
  pageId: string;
  recipientId: string;
  text: string;
}

const sentMessages: SentInstagramMessage[] = [];

export function getSentInstagramMessages(): SentInstagramMessage[] {
  return [...sentMessages];
}

export function resetMockInstagramGraph(): void {
  sentMessages.length = 0;
}

export class MockInstagramGraphProvider implements InstagramGraphProvider {
  verifyChallenge(verifyToken: string, challenge: string): string | null {
    if (verifyToken === 'dev-instagram-verify-token') {
      return challenge;
    }
    return null;
  }

  // In tests, always accept the signature so the mock bypasses real HMAC checks.
  verifySignature(): boolean {
    return true;
  }

  async sendMessage(params: SendInstagramMessageParams): Promise<void> {
    sentMessages.push({
      pageId: params.pageId,
      recipientId: params.recipientId,
      text: params.text,
    });
  }
}
