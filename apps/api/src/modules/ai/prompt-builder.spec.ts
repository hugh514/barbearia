import { ChannelConfig } from '@prisma/client';
import { buildSystemPrompt } from './prompt-builder';

describe('PromptBuilder', () => {
  const config: ChannelConfig = {
    id: 'cfg-1',
    tenantId: 'tenant-1',
    businessName: 'Barbearia Modelo',
    services: [{ name: 'Corte', price: 'R$ 45,00' }],
    address: 'Rua das Flores, 123',
    phone: '11999990000',
    workingHours: 'Seg-Sáb 9h-19h',
    rules: 'Sem agendamento.',
    whatsappInstance: 'barbearia-modelo',
    instagramPageId: 'fk-page',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('includes business name and service prices', () => {
    const prompt = buildSystemPrompt(config);

    expect(prompt).toContain('Barbearia Modelo');
    expect(prompt).toContain('Corte: R$ 45,00');
    expect(prompt).toContain('[TRANSFER_TO_HUMAN]');
  });
});
