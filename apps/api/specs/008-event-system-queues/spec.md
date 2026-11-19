# Spec 008: Sistema de Eventos e Filas (BullMQ)

**Branch:** `feat/008-event-system-queues`
**Status:** Ready for Implementation
**Depende de:** `005-appointments-attendance`, `007-payments-integration`

---

## Contexto

Este módulo implementa o sistema de filas assíncronas e processadores de eventos. Quando um atendimento é finalizado, ações como solicitar avaliação no Google, oferecer plano mensal e registrar métricas acontecem de forma assíncrona, nunca no handler HTTP (Artigo IV da constituição). BullMQ + Redis é a stack definida.

---

## User Stories

### US-008.1: Processamento Pós-Atendimento (Priority: P0)

**Como** sistema,
**Quero** que ao finalizar um atendimento, ações automáticas sejam disparadas de forma assíncrona,
**Para que** o barbeiro não espere na tela enquanto mensagens são enviadas.

**Critérios de Aceite:**
- [ ] Evento `ATENDIMENTO_FINALIZADO` dispara job na fila `post-attendance`
- [ ] Job executa em sequência: (1) Enviar WhatsApp pedindo avaliação Google (2) Se cliente sem plano, enviar oferta de plano
- [ ] Job tem retry: 3 tentativas com backoff exponencial (1min, 5min, 15min)
- [ ] Falha de uma ação não impede as demais (cada ação é um sub-job independente)

### US-008.2: Processamento Pós-Pagamento (Priority: P0)

**Como** sistema,
**Quero** que ao confirmar um pagamento, a assinatura e o cliente sejam atualizados assincronamente,
**Para que** o webhook retorne 200 imediatamente.

**Critérios de Aceite:**
- [ ] Evento `PAGAMENTO_APROVADO` dispara job na fila `post-payment`
- [ ] Job ativa subscription, atualiza customer.planStatus, envia confirmação no WhatsApp
- [ ] Evento `PAGAMENTO_RECUSADO` dispara job que notifica gerente no backoffice

### US-008.3: Processamento Pós-Cadastro (Priority: P1)

**Como** sistema,
**Quero** que ao cadastrar novo cliente automaticamente, uma mensagem de boas-vindas possa ser enviada,
**Para que** o CRM tenha engajamento desde o primeiro contato.

**Critérios de Aceite:**
- [ ] Evento `CLIENTE_CADASTRADO` dispara job na fila `post-registration`
- [ ] Job registra métrica de conversão (novo lead capturado)

### US-008.4: Monitoramento de Filas (Priority: P1)

**Como** admin,
**Quero** ver o status das filas de processamento,
**Para que** eu identifique se alguma automação está falhando.

**Critérios de Aceite:**
- [ ] `GET /queues/stats` retorna: jobs pendentes, ativos, falhados, completados por fila
- [ ] `GET /queues/:name/failed` lista últimos 20 jobs falhados com erro
- [ ] Apenas ADMIN pode acessar

---

## Arquitetura Técnica

### Filas

```
post-attendance  , ações após finalizar atendimento
post-payment     , ações após pagamento confirmado/recusado
post-registration, ações após cadastro de cliente
notifications    , fila genérica de envio de mensagens (WhatsApp, push)
```

### Fluxo

```
EventEmitter2 emite ATENDIMENTO_FINALIZADO
  → Listener no módulo queue adiciona job à fila "post-attendance"
    → BullMQ processa: 
      → Sub-job 1: chamar WhatsApp API (via módulo 010) para pedir avaliação
      → Sub-job 2: verificar se cliente tem plano; se não, enviar oferta
      → Registrar resultado no log
```

### Configuração BullMQ

```typescript
BullModule.forRoot({
  connection: { host: REDIS_HOST, port: REDIS_PORT }
});

BullModule.registerQueue(
  { name: 'post-attendance' },
  { name: 'post-payment' },
  { name: 'post-registration' },
  { name: 'notifications' },
);
```

---

## Modelo de Dados

Não há novas tabelas. BullMQ armazena jobs no Redis.

Opcional para auditoria futura:
```
EventLog:
  id          UUID PK
  tenant_id   UUID
  event_name  String
  payload     Json
  status      Enum: QUEUED | PROCESSING | COMPLETED | FAILED
  error       String?
  created_at  DateTime
  processed_at DateTime?
```

---

## Fora de Escopo

- Cron jobs para cobranças recorrentes (futuro)
- Dead letter queue com dashboard visual (futuro, usar Bull Board)
- Envio efetivo de mensagens (isso é Feature 010, aqui só enfileira)
