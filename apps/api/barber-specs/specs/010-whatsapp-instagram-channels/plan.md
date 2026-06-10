# Plano Técnico 010 — Canais WhatsApp e Instagram + IA

---

## Estrutura

```
src/modules/
  whatsapp/
    whatsapp.module.ts
    whatsapp.controller.ts       # Webhook + send
    whatsapp.service.ts          # Lógica de envio/recebimento
    providers/
      evolution-api.provider.ts  # Client HTTP para Evolution API
  instagram/
    instagram.module.ts
    instagram.controller.ts      # Webhook + send
    instagram.service.ts
    providers/
      instagram-graph.provider.ts
  ai/
    ai.module.ts
    ai.service.ts                # Motor IA
    prompt-builder.ts            # Monta system prompt a partir do config
    response-parser.ts           # Detecta [TRANSFER_TO_HUMAN], [UPDATE_CUSTOMER]
    providers/
      openai.provider.ts         # Client HTTP para OpenAI
  channel-config/
    channel-config.module.ts
    channel-config.controller.ts
    channel-config.service.ts
    dto/
      create-config.dto.ts
      update-config.dto.ts
```

## Fluxo Detalhado: WhatsApp

```
1. Evolution API envia POST /channels/whatsapp/webhook
2. WhatsAppController extrai: phone, content, instanceId
3. WhatsAppService:
   a. Identifica tenant pelo instanceId (query ChannelConfig)
   b. Chama CustomersService.upsert({ phone, origin: WHATSAPP })
   c. Chama ConversationsService.findOrCreate({ customerId, channel: WHATSAPP })
   d. Chama MessagesService.create({ conversationId, content, direction: INBOUND })
   e. Se conversa.status é AGUARDANDO ou EM_ATENDIMENTO: return (humano assumiu)
   f. Chama AiService.processMessage({ conversation, customer, message })
   g. AiService retorna resposta + possíveis ações
   h. Executa ações (transfer, update customer)
   i. Chama EvolutionApiProvider.sendText({ instance, phone, text })
   j. Registra mensagem OUTBOUND
4. Retorna 200 ao webhook
```

## OpenAI Integration

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({
      role: m.direction === 'INBOUND' ? 'user' : 'assistant',
      content: m.content
    })),
    { role: 'user', content: newMessage }
  ],
  max_tokens: 500,
  temperature: 0.7,
});
```

## Response Parser

```typescript
function parseAiResponse(text: string): ParsedResponse {
  const actions: Action[] = [];
  let cleanText = text;
  
  if (text.includes('[TRANSFER_TO_HUMAN]')) {
    actions.push({ type: 'TRANSFER_TO_HUMAN' });
    cleanText = cleanText.replace('[TRANSFER_TO_HUMAN]', '').trim();
  }
  
  const updateMatch = text.match(/\[UPDATE_CUSTOMER:(\w+):(.+?)\]/);
  if (updateMatch) {
    actions.push({ type: 'UPDATE_CUSTOMER', field: updateMatch[1], value: updateMatch[2] });
    cleanText = cleanText.replace(updateMatch[0], '').trim();
  }
  
  return { text: cleanText, actions };
}
```

---

## Schema Prisma

```prisma
model ChannelConfig {
  id               String   @id @default(uuid())
  tenantId         String   @unique @map("tenant_id")
  tenant           Tenant   @relation(fields: [tenantId], references: [id])
  businessName     String   @map("business_name")
  services         Json     @default("[]")
  address          String
  phone            String
  workingHours     String   @map("working_hours")
  rules            String?
  whatsappInstance String?  @map("whatsapp_instance")
  instagramPageId  String?  @map("instagram_page_id")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("channel_configs")
}
```

---

## Variáveis de Ambiente Adicionais

```env
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=

# Instagram
INSTAGRAM_VERIFY_TOKEN=
INSTAGRAM_PAGE_ACCESS_TOKEN=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
```

---

## Pacotes

```bash
npm install openai axios
```
