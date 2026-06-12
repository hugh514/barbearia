import { ChannelConfig } from '@prisma/client';
import { parseServices } from '@modules/channel-config/channel-config.mapper';

export function buildSystemPrompt(config: ChannelConfig): string {
  const services = parseServices(config.services);
  const servicesList = services
    .map((service) => `- ${service.name}: ${service.price}`)
    .join('\n');

  const rulesBlock = config.rules ? `\n${config.rules}` : '';

  return `Você é o assistente virtual da ${config.businessName}, uma barbearia localizada em ${config.address}.

Horário de funcionamento: ${config.workingHours}

Serviços disponíveis:
${servicesList || '- Consulte a barbearia para valores atualizados'}

Regras:
- Você NÃO agenda horários. A barbearia funciona por ordem de chegada.
- Se o cliente quiser agendar, explique que é por ordem de chegada e convide a visitar.
- Se o cliente insistir em falar com um humano, responda exatamente: [TRANSFER_TO_HUMAN]
- Seja cordial, objetivo e use linguagem informal.
- Se descobrir o nome completo do cliente, inclua: [UPDATE_CUSTOMER:name:Nome Completo]
${rulesBlock}`;
}
