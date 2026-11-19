# Tasks 010: Canais WhatsApp e Instagram + IA

---

## Fase 1: Schema e Config

- [x] T010-01 Adicionar model ChannelConfig ao Prisma
- [x] T010-02 Rodar migration
- [x] T010-03 Criar ChannelConfigModule com CRUD
- [x] T010-04 Implementar POST/GET/PATCH /channels/config (ADMIN only)
- [x] T010-05 Atualizar seed com config da Barbearia Modelo

## Fase 2: Motor IA

- [x] T010-06 Instalar openai SDK
- [x] T010-07 Criar AiModule e AiService
- [x] T010-08 Criar OpenAiProvider com chamada a chat.completions
- [x] T010-09 Criar PromptBuilder que monta system prompt a partir do ChannelConfig
- [x] T010-10 Criar ResponseParser que detecta [TRANSFER_TO_HUMAN] e [UPDATE_CUSTOMER]
- [x] T010-11 Implementar AiService.processMessage() com contexto de últimas 10 mensagens
- [x] T010-12 Testar: resposta a "quanto custa o corte" retorna preço configurado
- [x] T010-13 Testar: "quero falar com alguém" retorna ação TRANSFER_TO_HUMAN

## Fase 3: WhatsApp (Evolution API)

- [x] T010-14 Criar WhatsAppModule
- [x] T010-15 Criar EvolutionApiProvider com métodos: sendText, verifyWebhook
- [x] T010-16 Implementar POST /channels/whatsapp/webhook com fluxo completo:
       webhook → upsert customer → find/create conversation → register message → IA → send response
- [x] T010-17 Implementar POST /channels/whatsapp/send (envio ativo para automações)
- [x] T010-18 Implementar identificação de tenant por instanceId
- [x] T010-19 Testar: mensagem de número novo cria cliente + conversa + responde

## Fase 4: Instagram

- [x] T010-20 Criar InstagramModule
- [x] T010-21 Criar InstagramGraphProvider com métodos: sendMessage, verifyChallenge
- [x] T010-22 Implementar GET /channels/instagram/webhook (challenge verification)
- [x] T010-23 Implementar POST /channels/instagram/webhook com fluxo completo
- [x] T010-24 Implementar identificação de tenant por pageId
- [x] T010-25 Testar: DM do Instagram cria cliente com origin INSTAGRAM

## Fase 5: Transferência para Humano

- [x] T010-26 Implementar: quando IA retorna TRANSFER_TO_HUMAN, marcar conversa AGUARDANDO
- [x] T010-27 Emitir Socket.IO conversation.updated para backoffice
- [x] T010-28 Implementar POST /channels/:channel/reply (backoffice responde)
- [x] T010-29 Testar: conversa AGUARDANDO não recebe resposta da IA (humano assumiu)
- [x] T010-30 Testar: reply do backoffice envia pelo canal correto

## Fase 6: Integração com Filas (Feature 008)

- [x] T010-31 Conectar PostAttendanceProcessor para chamar WhatsAppService.send
- [x] T010-32 Conectar PostPaymentProcessor para enviar confirmação por WhatsApp
- [x] T010-33 Testar: finalizar atendimento dispara mensagem WhatsApp de avaliação

## Fase 7: Validação Final

- [x] T010-34 Bot WhatsApp funcional end-to-end
- [x] T010-35 Bot Instagram funcional end-to-end
- [x] T010-36 IA responde com informações corretas da barbearia
- [x] T010-37 Transfer para humano funcional
- [x] T010-38 Automações pós-atendimento enviam WhatsApp
- [x] T010-39 Swagger documentado com todos os webhooks
