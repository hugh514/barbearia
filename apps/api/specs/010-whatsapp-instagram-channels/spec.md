# Spec 010: Canais WhatsApp e Instagram + IA

**Branch:** `feat/010-whatsapp-instagram-channels`
**Status:** Ready for Implementation
**Depende de:** `004-conversations-messaging`, `008-event-system-queues`

---

## Contexto

Este é o módulo que conecta a barbearia ao mundo externo. O bot atende clientes no WhatsApp (via Evolution API) e no Instagram (via Instagram Graph API), responde dúvidas com IA (OpenAI GPT-4o), captura dados para o CRM, e transfere para humano quando necessário. O bot NÃO agenda, ele informa, captura e direciona (Artigo X).

---

## User Stories

### US-010.1: Receber Mensagem do WhatsApp (Priority: P0)

**Como** sistema,
**Quero** receber mensagens do WhatsApp via webhook da Evolution API,
**Para que** o bot possa processar e responder.

**Critérios de Aceite:**
- [ ] `POST /channels/whatsapp/webhook` recebe payload da Evolution API
- [ ] Valida instância por tenant (cada barbearia tem sua instância)
- [ ] Extrai: remetente (telefone), conteúdo, timestamp, messageId
- [ ] Faz upsert de cliente via `POST /customers/upsert` (CRM automático)
- [ ] Cria/reaproveita conversa no canal WHATSAPP
- [ ] Registra mensagem como INBOUND
- [ ] Envia para o motor de IA para gerar resposta
- [ ] Resposta da IA é enviada de volta pelo WhatsApp e registrada como OUTBOUND

### US-010.2: Receber Mensagem do Instagram (Priority: P0)

**Como** sistema,
**Quero** receber DMs do Instagram via Graph API webhook,
**Para que** clientes do Instagram sejam atendidos pelo mesmo bot.

**Critérios de Aceite:**
- [ ] `POST /channels/instagram/webhook` recebe payload da Meta Graph API
- [ ] `GET /channels/instagram/webhook` responde challenge de verificação
- [ ] Extrai: senderId, texto, timestamp
- [ ] Faz upsert de cliente com origin INSTAGRAM e instagramId
- [ ] Cria/reaproveita conversa no canal INSTAGRAM
- [ ] Registra mensagem e processa com IA
- [ ] Resposta enviada via Instagram Send API

### US-010.3: Motor de IA (Priority: P0)

**Como** sistema,
**Quero** que um motor de IA processe cada mensagem recebida e gere uma resposta contextualizada,
**Para que** o cliente tenha atendimento inteligente 24h.

**Critérios de Aceite:**
- [ ] IA usa GPT-4o via OpenAI API
- [ ] System prompt contém: nome da barbearia, serviços, preços, endereço, horário, regras
- [ ] IA recebe contexto: últimas 10 mensagens da conversa + dados do cliente
- [ ] IA pode: responder dúvidas, informar preços, informar endereço, sugerir plano
- [ ] IA NÃO pode: agendar horários, confirmar disponibilidade, processar pagamento
- [ ] Se IA detecta que cliente quer falar com humano → marca conversa como AGUARDANDO
- [ ] Se IA detecta informação nova (nome completo) → atualiza via API

### US-010.4: Enviar Mensagem pelo WhatsApp (Priority: P0)

**Como** sistema,
**Quero** enviar mensagens ativas pelo WhatsApp,
**Para que** automações pós-atendimento funcionem (avaliação, oferta de plano).

**Critérios de Aceite:**
- [ ] `POST /channels/whatsapp/send` aceita: phone, message, tenantId
- [ ] Envia via Evolution API
- [ ] Registra como mensagem OUTBOUND na conversa do cliente
- [ ] Usado pelos processors da Feature 008 (post-attendance, etc)
- [ ] Protegido por API key interna

### US-010.5: Configuração do Bot por Tenant (Priority: P1)

**Como** admin,
**Quero** configurar as informações que o bot usa para responder,
**Para que** cada barbearia tenha respostas personalizadas.

**Critérios de Aceite:**
- [ ] `POST /channels/config` aceita: businessName, services[], prices, address, hours, rules
- [ ] `GET /channels/config` retorna configuração atual do tenant
- [ ] `PATCH /channels/config` atualiza parcialmente
- [ ] Configuração é usada para montar o system prompt da IA
- [ ] Apenas ADMIN pode editar

### US-010.6: Responder pelo Backoffice (Priority: P1)

**Como** barbeiro ou gerente,
**Quero** responder mensagens de clientes diretamente pelo backoffice,
**Para que** eu assuma o atendimento quando o bot não consegue resolver.

**Critérios de Aceite:**
- [ ] `POST /channels/:channel/reply` aceita: conversationId, message
- [ ] Envia a mensagem pelo canal correto (WhatsApp ou Instagram)
- [ ] Registra como OUTBOUND na conversa
- [ ] Marca conversa como EM_ATENDIMENTO com assignedTo = userId

---

## Modelo de Dados

```
ChannelConfig:
  id                UUID PK
  tenant_id         UUID FK → tenants UNIQUE
  business_name     String
  services          Json (array de { name, price })
  address           String
  phone             String
  working_hours     String
  rules             String? (regras extras para o bot)
  whatsapp_instance String? (instância Evolution API)
  instagram_page_id String?
  created_at        DateTime
  updated_at        DateTime

  UNIQUE(tenant_id)
```

---

## Arquitetura do Bot

```
Mensagem chega (webhook)
  → Middleware de validação
  → Upsert cliente (CRM automático)
  → Registra mensagem INBOUND
  → Verifica status da conversa:
    → Se AGUARDANDO ou EM_ATENDIMENTO: não envia para IA (humano assumiu)
    → Se ABERTA: envia para motor IA
  → Motor IA:
    → Monta prompt: system prompt (config) + contexto (últimas mensagens + dados cliente)
    → Chama OpenAI GPT-4o
    → Analisa resposta: 
      → Se contém [TRANSFER_TO_HUMAN]: marca conversa AGUARDANDO, notifica backoffice
      → Se contém [UPDATE_CUSTOMER:{field}:{value}]: atualiza cliente via API
      → Caso contrário: envia resposta normal
  → Envia resposta pelo canal (WhatsApp ou Instagram)
  → Registra mensagem OUTBOUND
```

## System Prompt Template

```
Você é o assistente virtual da {business_name}, uma barbearia localizada em {address}.

Horário de funcionamento: {working_hours}

Serviços disponíveis:
{services_list}

Regras:
- Você NÃO agenda horários. A barbearia funciona por ordem de chegada.
- Se o cliente quiser agendar, explique que é por ordem de chegada e convide a visitar.
- Se o cliente insistir em falar com um humano, responda exatamente: [TRANSFER_TO_HUMAN]
- Seja cordial, objetivo e use linguagem informal.
- Se descobrir o nome completo do cliente, inclua: [UPDATE_CUSTOMER:name:Nome Completo]

{rules}
```

---

## Integrações Externas

### Evolution API (WhatsApp)
- Endpoint: configurável por env
- Auth: API key
- Webhook: POST com payload de mensagem
- Send: POST /message/sendText/{instance}

### Instagram Graph API
- Webhook: verificação de challenge + recebimento de DMs
- Send: POST /{page_id}/messages
- Auth: Page Access Token

### OpenAI
- Model: gpt-4o
- Endpoint: https://api.openai.com/v1/chat/completions
- Auth: API key por env (global) ou por tenant (futuro)

---

## Eventos Emitidos

| Evento | Quando |
|--------|--------|
| `MENSAGEM_RECEBIDA` | Nova mensagem de qualquer canal |
| Socket `message.new` | Real-time para backoffice |
| Socket `conversation.updated` | Quando status muda (transfer to human) |

---

## Fora de Escopo

- Mensagens com mídia (imagens, áudio, vídeo), futuro
- Chatbot com fluxos fixos (Typebot-style), a IA é livre-forma
- Múltiplas instâncias WhatsApp por tenant
- Bot para Telegram, Facebook Messenger
