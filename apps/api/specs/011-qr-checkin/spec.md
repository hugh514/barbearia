# Spec 011: Check-in por QR Code

**Branch:** `feature/011-qr-checkin`
**Status:** Implemented
**Depende de:** `005-appointments-attendance`, `010-whatsapp-instagram-channels`

---

## Contexto

O cliente chega à barbearia e precisa entrar na fila walk-in sem depender do balcão. O app mobile gera um QR code com token efêmero; a equipe escaneia no backoffice ou app do barbeiro e o cliente entra automaticamente na fila do dia. Não há agendamento, apenas ordem de chegada (Artigo X). Tokens vivem exclusivamente no Redis; nenhuma tabela nova no banco relacional.

---

## User Stories

### US-011.1: Gerar Token de Check-in (Priority: P0)

**Como** cliente com cadastro vinculado ao app,
**Quero** gerar um token efêmero para exibir em QR code,
**Para que** a equipe me identifique rapidamente na chegada.

**Critérios de Aceite:**
- [ ] `POST /checkin/token` disponível apenas para role `CLIENTE`
- [ ] Usuário deve ter `customerId` vinculado e ativo no tenant
- [ ] Token opaco de 64 caracteres hex (32 bytes), TTL 60 segundos no Redis
- [ ] Regenerar token invalida o anterior do mesmo cliente
- [ ] Resposta: `{ token, expiresInSeconds: 60 }`
- [ ] Sem `customerId` vinculado retorna 422 com mensagem clara

### US-011.2: Consumir Token e Entrar na Fila (Priority: P0)

**Como** barbeiro, gerente ou admin,
**Quero** escanear o QR e registrar o cliente na fila,
**Para que** o atendimento walk-in comece sem digitação manual.

**Critérios de Aceite:**
- [ ] `POST /checkin/consume` aceita `{ token }`, roles `ADMIN`, `GERENTE`, `BARBEIRO`
- [ ] Consumo atômico via `GETDEL` no Redis (uso único)
- [ ] Token inválido, expirado ou de outro tenant retorna 404 genérico
- [ ] Cria `Appointment` com status `AGUARDANDO` se não houver atendimento aberto no dia
- [ ] Se já existir atendimento `AGUARDANDO` ou `EM_ATENDIMENTO` no dia, retorna o existente (`reused: true`)
- [ ] Resposta inclui `appointment`, `queuePosition` e `reused`
- [ ] Cliente inativo retorna 422

### US-011.3: Evento Assíncrono Pós Check-in (Priority: P1)

**Como** sistema,
**Quero** publicar evento de domínio após check-in bem-sucedido,
**Para que** notificações e métricas sejam processadas fora do handler HTTP.

**Critérios de Aceite:**
- [ ] Emite `CHECKIN_REALIZADO` via EventEmitter2 após criação/reuso do atendimento
- [ ] Listener despacha job na fila BullMQ `checkin`
- [ ] Nenhum efeito colateral (WhatsApp, push, etc.) no handler HTTP

---

## Requisitos Funcionais

| ID | Requisito |
|----|-----------|
| FR-001 | Endpoint de geração restrito a `CLIENTE` |
| FR-002 | Token 32 bytes hex, TTL 60 s, invalidação na regeneração |
| FR-003 | Endpoint de consumo restrito a `ADMIN`, `GERENTE`, `BARBEIRO` |
| FR-004 | Consumo atômico com `GETDEL`; erros genéricos sem vazar existência de token |
| FR-005 | Criação de atendimento walk-in (`AGUARDANDO`), sem campos de agendamento |
| FR-006 | Idempotência: reutiliza atendimento aberto do mesmo dia |
| FR-007 | `queuePosition` derivado da fila do dia (`createdAt ASC`) |
| FR-008 | Concorrência: exatamente um consumidor vence por token |
| FR-009 | Evento `CHECKIN_REALIZADO` + fila BullMQ assíncrona |
| FR-010 | Token nunca persistido no PostgreSQL |
| FR-011 | `tenantId` em todas as chaves Redis e queries Prisma |

---

## Modelo de Dados

Sem migrations novas. O módulo usa:

- **Redis**: `checkin:{tenantId}:{token}` → `customerId` (TTL 60 s); chave reversa `checkin:customer:{tenantId}:{customerId}` → token atual
- **PostgreSQL**: leitura de `Customer` e criação/leitura de `Appointment` (Feature 005)

---

## Endpoints

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | `/checkin/token` | CLIENTE | Gera ou regenera token efêmero |
| POST | `/checkin/consume` | ADMIN, GERENTE, BARBEIRO | Consome token e entra na fila |

---

## Segurança e Rate Limiting

- Rate limit: 10 req/min em `/checkin/token`, 30 req/min em `/checkin/consume`
- Token nunca aparece em logs de aplicação
- Isolamento multi-tenant em chaves Redis e validação de `customer.tenantId`

---

## Critérios de Sucesso

| ID | Critério |
|----|----------|
| SC-001 | Fluxo completo gerar + consumir em menos de 15 segundos |
| SC-002 | Token expira em no máximo 90 segundos (TTL 60 s + margem) |
| SC-003 | Dois check-ins do mesmo cliente no mesmo dia retornam `reused: true` na segunda vez |
| SC-004 | Testes e2e `feature-011.e2e-spec.ts` passando |

---

## Fora de Escopo

- Geração visual do QR code no frontend (responsabilidade do app mobile)
- Agendamento por horário ou calendário
- Persistência de histórico de tokens no banco
- Notificações push ao cliente após check-in (fila preparada, implementação futura)
