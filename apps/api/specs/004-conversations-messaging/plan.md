# Plano Técnico 004 — Conversas e Mensagens (Omnichannel)

**Input:** `specs/004-conversations-messaging/spec.md`

---

## Verificação Constitucional

| Artigo | Status | Nota |
|--------|--------|------|
| I — API como Hub | ✅ | Mensagens registradas via API, nunca direto no banco |
| II — Multi-tenancy | ✅ | Conversation e Message com tenant_id |
| III — Stack canônica | ✅ | Socket.IO para real-time |
| IV — Orientação a Eventos | ✅ | MENSAGEM_RECEBIDA emitido; Socket events para real-time |
| V — Separação de módulos | ✅ | `conversations/` e `messages/` separados |

---

## Arquitetura Técnica

### Estrutura de Diretórios

```
src/modules/
  conversations/
    conversations.module.ts
    conversations.controller.ts
    conversations.service.ts
    conversations.gateway.ts        # Socket.IO gateway
    dto/
      create-conversation.dto.ts
      update-status.dto.ts
      conversation-query.dto.ts
      conversation-response.dto.ts
  messages/
    messages.module.ts
    messages.controller.ts
    messages.service.ts
    dto/
      create-message.dto.ts
      message-response.dto.ts
```

### Schema Prisma

```prisma
model Conversation {
  id          String             @id @default(uuid())
  tenantId    String             @map("tenant_id")
  tenant      Tenant             @relation(fields: [tenantId], references: [id])
  customerId  String             @map("customer_id")
  customer    Customer           @relation(fields: [customerId], references: [id])
  channel     ConversationChannel
  status      ConversationStatus @default(ABERTA)
  assignedTo  String?            @map("assigned_to")
  assignedUser User?             @relation(fields: [assignedTo], references: [id])
  createdAt   DateTime           @default(now()) @map("created_at")
  updatedAt   DateTime           @updatedAt @map("updated_at")

  messages    Message[]

  @@index([tenantId, status])
  @@index([tenantId, customerId])
  @@map("conversations")
}

model Message {
  id             String             @id @default(uuid())
  tenantId       String             @map("tenant_id")
  conversationId String             @map("conversation_id")
  conversation   Conversation       @relation(fields: [conversationId], references: [id])
  content        String
  direction      MessageDirection
  channel        ConversationChannel
  externalId     String?            @map("external_id")
  createdAt      DateTime           @default(now()) @map("created_at")

  @@index([conversationId])
  @@index([tenantId])
  @@map("messages")
}

enum ConversationChannel {
  WHATSAPP
  INSTAGRAM
}

enum ConversationStatus {
  ABERTA
  AGUARDANDO
  EM_ATENDIMENTO
  FECHADA
}

enum MessageDirection {
  INBOUND
  OUTBOUND
}
```

### Socket.IO Architecture

```
Namespace: /conversations
Rooms: tenant:{tenantId}

Events emitidos pelo servidor:
  conversation.updated  → quando status ou assignedTo muda
  message.new          → quando nova mensagem é registrada

Autenticação: JWT no handshake (query param ou auth header)
Tenant isolation: cada cliente Socket.IO entra no room do seu tenant
```

---

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/conversations` | API Key | Criar conversa |
| GET | `/conversations` | JWT | Listar conversas (filtros: status, channel, assignedTo) |
| GET | `/conversations/stats` | JWT | Totais por status |
| GET | `/conversations/:id` | JWT | Detalhes da conversa |
| PATCH | `/conversations/:id/status` | JWT | Atualizar status/assignedTo |
| POST | `/conversations/:id/messages` | API Key | Registrar mensagem |
| GET | `/conversations/:id/messages` | JWT | Listar mensagens paginadas |
