# Spec 004: Conversas e Mensagens (Omnichannel)

**Branch:** `feat/004-conversations-messaging`
**Status:** Ready for Implementation
**Depende de:** `003-customer-crm`

---

## Contexto

Toda mensagem recebida, WhatsApp ou Instagram, deve ser registrada na API para construir o histórico de conversas. Este módulo implementa o CRM de mensagens: cada cliente tem um histórico contínuo de interações, com suporte a múltiplos canais.

---

## User Stories

### US-004.1: Registrar Mensagem Recebida (Priority: P0)

**Critérios de Aceite:**
- [ ] `POST /conversations/:conversationId/messages` registra uma mensagem
- [ ] Campos: `content`, `direction` (INBOUND|OUTBOUND), `channel`, `externalId`
- [ ] Se conversationId não existir para o cliente+canal: criar nova conversa
- [ ] Evento `MENSAGEM_RECEBIDA` emitido após registro
- [ ] Protegido por API key interna

### US-004.2: Abrir ou Reaproveitar Conversa (Priority: P0)

**Critérios de Aceite:**
- [ ] Uma conversa ABERTA por cliente por canal por vez
- [ ] Se já tem conversa ABERTA no canal: nova mensagem vai para ela
- [ ] Conversa FECHADA → nova mensagem cria nova conversa
- [ ] `POST /conversations` cria conversa explicitamente

### US-004.3: Listar Conversas do Backoffice (Priority: P0)

**Critérios de Aceite:**
- [ ] `GET /conversations` paginado por tenant
- [ ] Filtros: `status`, `channel`, `assignedTo`
- [ ] Cada item inclui: cliente, último canal, preview da última mensagem, status
- [ ] Ordenação: última mensagem mais recente primeiro
- [ ] Socket.IO: evento `conversation.updated` emitido em tempo real

### US-004.4: Ver Mensagens (Priority: P0)

**Critérios de Aceite:**
- [ ] `GET /conversations/:id/messages` paginado (mais recentes primeiro)
- [ ] Cada mensagem: content, direction, channel, createdAt, externalId
- [ ] Acesso a conversa de outro tenant retorna 404

### US-004.5: Transferir para Humano (Priority: P0)

**Critérios de Aceite:**
- [ ] `PATCH /conversations/:id/status` aceita: AGUARDANDO, EM_ATENDIMENTO, FECHADA
- [ ] AGUARDANDO emite Socket.IO no room do tenant
- [ ] EM_ATENDIMENTO registra `assignedTo`
- [ ] FECHADA só por BARBEIRO, GERENTE ou ADMIN

### US-004.6: Métricas de Conversas (Priority: P2)

**Critérios de Aceite:**
- [ ] `GET /conversations/stats` com totais por status
- [ ] Dados detalhados disponíveis via Feature 009

---

## Modelo de Dados

```
Conversation:
  id, tenant_id, customer_id, channel, status, assigned_to, created_at, updated_at
  
  INDEX(tenant_id, status)
  INDEX(tenant_id, customer_id)

Message:
  id, conversation_id, tenant_id, content, direction, channel, external_id, created_at

  INDEX(conversation_id)
  INDEX(tenant_id)
```

---

## Eventos Emitidos

| Evento | Quando |
|--------|--------|
| `MENSAGEM_RECEBIDA` | Nova mensagem registrada |
| Socket `conversation.updated` | Status ou atribuição muda |
| Socket `message.new` | Nova mensagem em conversa aberta |

---

## Fora de Escopo

- Envio de mensagens (Feature 010)
- Anexos/mídia (futuro)
- Chatbot e IA (Feature 010)
