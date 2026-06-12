import {
  EvolutionApiProvider,
  SendTextParams,
} from '../../src/modules/whatsapp/providers/evolution-api.provider';

export interface SentWhatsAppMessage {
  instance: string;
  phone: string;
  text: string;
}

const sentMessages: SentWhatsAppMessage[] = [];

export function getSentWhatsAppMessages(): SentWhatsAppMessage[] {
  return [...sentMessages];
}

export function resetMockEvolutionApi(): void {
  sentMessages.length = 0;
}

export class MockEvolutionApiProvider implements EvolutionApiProvider {
  verifyWebhook(): boolean {
    return true;
  }

  async sendText(params: SendTextParams): Promise<void> {
    sentMessages.push({
      instance: params.instance,
      phone: params.phone,
      text: params.text,
    });
  }
}
