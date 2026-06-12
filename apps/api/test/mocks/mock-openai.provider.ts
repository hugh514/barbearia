import {
  ChatMessage,
  OpenAiProvider,
} from '../../src/modules/ai/providers/openai.provider';

type ResponseHandler = (messages: ChatMessage[]) => string;

let defaultHandler: ResponseHandler = () =>
  'Nosso corte custa R$ 45,00. Funcionamos por ordem de chegada!';

export function setMockOpenAiHandler(handler: ResponseHandler): void {
  defaultHandler = handler;
}

export function resetMockOpenAi(): void {
  defaultHandler = () =>
    'Nosso corte custa R$ 45,00. Funcionamos por ordem de chegada!';
}

export class MockOpenAiProvider implements OpenAiProvider {
  async createChatCompletion(messages: ChatMessage[]): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const text = lastUser?.content.toLowerCase() ?? '';

    if (
      text.includes('falar com alguém') ||
      text.includes('falar com alguem')
    ) {
      return '[TRANSFER_TO_HUMAN]';
    }

    if (
      text.includes('quanto custa o corte') ||
      text.includes('preço do corte')
    ) {
      return 'O corte custa R$ 45,00 na Barbearia Modelo!';
    }

    return defaultHandler(messages);
  }
}
