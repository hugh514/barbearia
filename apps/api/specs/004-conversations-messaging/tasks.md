# Tasks 004: Conversas e Mensagens (Omnichannel)

**Input:** `specs/004-conversations-messaging/plan.md`

---

## Fase 1: Schema e Módulos

- [x] T004-01 Adicionar models `Conversation` e `Message` ao Prisma com enums
- [x] T004-02 Rodar `prisma migrate dev --name add-conversations-messages`
- [x] T004-03 Criar `ConversationsModule` e `MessagesModule`
- [x] T004-04 Criar DTOs com validação Zod para ambos os módulos

## Fase 2: CRUD de Conversas

- [x] T004-05 Implementar `POST /conversations` com lógica de auto-create: se cliente já tem conversa ABERTA no canal, retorna ela
- [x] T004-06 Implementar `GET /conversations` com filtros (status, channel, assignedTo) e paginação
- [x] T004-07 Implementar `GET /conversations/:id` com verificação de tenant
- [x] T004-08 Implementar `PATCH /conversations/:id/status` com regras de transição
- [x] T004-09 Implementar `GET /conversations/stats` com count por status
- [x] T004-10 Testar: conversa de outro tenant retorna 404

## Fase 3: Mensagens

- [x] T004-11 Implementar `POST /conversations/:id/messages` com registro e emissão de evento
- [x] T004-12 Implementar lógica: se conversa FECHADA recebe mensagem, cria nova conversa automaticamente
- [x] T004-13 Implementar `GET /conversations/:id/messages` paginado (mais recentes primeiro)
- [x] T004-14 Emitir evento `MENSAGEM_RECEBIDA` via EventEmitter2 ao registrar mensagem
- [x] T004-15 Testar: mensagem em conversa fechada cria nova conversa

## Fase 4: Socket.IO Real-time

- [x] T004-16 Instalar `@nestjs/websockets` e `socket.io`
- [x] T004-17 Criar `ConversationsGateway` com namespace `/conversations`
- [x] T004-18 Implementar autenticação JWT no handshake do Socket
- [x] T004-19 Implementar rooms por tenant: `tenant:{tenantId}`
- [x] T004-20 Emitir `conversation.updated` quando status muda
- [x] T004-21 Emitir `message.new` quando nova mensagem é registrada
- [x] T004-22 Testar: mensagem nova notifica clientes conectados no room do tenant

## Fase 5: Integração com Customers

- [x] T004-23 Atualizar `GET /customers/:id/conversations` para retornar dados reais
- [x] T004-24 Documentar todos os endpoints e eventos Socket no Swagger
- [x] T004-25 Atualizar seed com conversas e mensagens de exemplo

## Fase 6: Validação Final

- [x] T004-26 Conversas criadas e listadas corretamente com filtros
- [x] T004-27 Mensagens registradas com histórico contínuo por canal
- [x] T004-28 Socket.IO emite eventos em tempo real no room correto
- [x] T004-29 Isolamento de tenant verificado em conversas e mensagens
