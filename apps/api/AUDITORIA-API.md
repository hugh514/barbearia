# Auditoria da API Barbearia

Data: 2026-07-16
Método: fan-out de 8 agentes (modelos baratos/haiku) por domínio + verificação manual (spot-check) das severidades CRÍTICA/ALTA + `npm audit` + `tsc` + `lint` + testes.

Legenda de verificação:
- ✅ **CONFIRMADO** — reproduzido/lido manualmente no código.
- ⚠️ **PLAUSÍVEL** — reportado por agente, não verificado 1:1 ainda.
- ❌ **FALSO POSITIVO** — verificado e refutado.

---

## Estado do build

| Check | Resultado |
|-------|-----------|
| `tsc --noEmit` | ✅ limpa (após `npm install` + `prisma generate`; ambiente estava stale) |
| `npm test` (unit) | ✅ 3 testes, 2 suites, passa |
| `npm audit` | ⚠️ 56 vulnerabilidades (12 high, 41 moderate, 3 low) — majoritariamente transitivas |
| `lint` | ⚠️ ESLint tentando parsear `dist/` — falta ignorar `dist/` no `.eslintignore` |

---

## ✅ Fixes aplicados nesta auditoria

| ID | Fix | Arquivo | Verificação |
|----|-----|---------|-------------|
| C1 | `.env` removido do índice do git (`git rm --cached`) | — | ⚠️ **rotacionar segredos** (ainda no histórico) |
| C2 | Webhook WhatsApp só aceita `apikey` do header (sem fallback ao body) | `whatsapp.controller.ts` | tsc ✅ |
| C3 | Refresh token com `GETDEL` atômico (anti-replay) | `auth.service.ts` | tsc ✅ |
| C4 | `bcrypt.compare` sempre executado (decoy hash) contra timing/enumeração | `auth.service.ts` | tsc ✅ |
| C5 | `AiService` não acessa mais o Prisma; histórico injetado pelo handler | `ai.service.ts`, `channel-message-handler.service.ts` | tsc ✅ |
| C6 | `customer.name`/`phone` sanitizados antes do system prompt | `ai.service.ts` | tsc ✅ |
| A2 | `tenantId` no `where` de `update`/`softDisable` de planos | `plans.service.ts` | tsc ✅ |
| — | Dockerfile de produção roda como usuário `node` (não-root) | `Dockerfile` | — |
| — | ESLint ignora `dist/`/`node_modules/` (lint estava quebrado) | `.eslintrc.js` | lint ✅ |
| — | `npm audit fix` (não-breaking): high 12 → 7 | — | — |

Após os fixes: `tsc` limpa, `lint` limpo, testes unitários 3/3 passando.

**Race conditions da fila (R1–R3) — ✅ CORRIGIDO** (migração `20260716000000_add_queue_race_guards`):
- `uniq_active_appt_per_customer` (índice único parcial): no máx. 1 atendimento ativo por cliente → check-in idempotente e sem duplicação sob concorrência. `checkin.consumeToken` agora é `$transaction` com tratamento de `P2002` (re-busca o vencedor da corrida).
- `uniq_active_appt_per_barber` (índice único parcial): no máx. 1 `EM_ATENDIMENTO` por barbeiro → `appointments.start` traduz `P2002` para `409`. Provado via SQL (segundo insert bloqueado).

**Pendentes (documentados, não aplicados — exigem refatoração maior):** `TenantGuard` global (A1), DLQ BullMQ (A8), tratamento de timezone no dashboard, validação de env do JWT (A10), vulns que exigem major bump (`npm audit fix --force`). Ver seções abaixo.

## CRÍTICAS

### C1. `.env` versionado com segredos reais ✅ CONFIRMADO
`git ls-files .env` retorna o arquivo. `.gitignore` tem `.env` (linha 3) mas foi adicionado **depois** do commit — o arquivo continua rastreado. Contém `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_API_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `DATABASE_URL`, `REDIS_PASSWORD`.
**Fix:** `git rm --cached .env` + **rotacionar todos os segredos** (já estão no histórico do git).

### C2. Webhook WhatsApp aceita `apikey` do corpo ✅ CONFIRMADO
`src/modules/whatsapp/whatsapp.controller.ts:49` — `const apiKey = headerApiKey ?? payload.apikey`. Atacante forja POST com `apikey` válido no body e passa a validação.
**Fix:** validar **apenas** o header; idealmente HMAC como o Instagram já faz.

### C3. Race condition no refresh token (replay) ✅ CONFIRMADO
`src/modules/auth/auth.service.ts:104-110` — `redis.get(key)` seguido de `redis.del(key)` não é atômico. Dois requests paralelos com o mesmo refresh token passam ambos antes do primeiro deletar.
**Fix:** `GETDEL` atômico (Redis 6.2+) ou script Lua / MULTI-EXEC.

### C4. Timing attack / enumeração de usuários no login ✅ CONFIRMADO
`src/modules/auth/auth.service.ts:65-83` — quando o email não existe, retorna antes do `bcrypt.compare`. Tempo de resposta distingue "email inexistente" (rápido) de "senha errada" (lento).
**Fix:** sempre executar `bcrypt.compare` contra um hash dummy quando o usuário não existir.

### C5. IA acessa o banco direto (viola Artigo IV) ✅ CONFIRMADO (arquitetural)
`src/modules/ai/ai.service.ts:72` — `this.prisma.message.findMany(...)`. A regra constitucional é "A IA nunca acessa o banco direto". É código server-side (não o modelo OpenAI), mas o handler de canal deve injetar o histórico via parâmetro para manter a fronteira.
**Fix:** `ChannelMessageHandlerService` passa `history` para `AiService`; remover `PrismaService` do `AiService`.

### C6. Prompt injection via dados do cliente ✅ CONFIRMADO
`src/modules/ai/ai.service.ts:51` — `nome="${input.customer.name}"` interpolado sem escape no system prompt. `customer.name` vem do webhook (controlável).
**Fix:** sanitizar/escapar; o comando `[UPDATE_CUSTOMER:field:value]` também precisa de whitelist de `field` (só `name`) — `channel-message-handler.service.ts:216`.

### C7. `ValidationPipe`/whitelist não é global ⚠️ PLAUSÍVEL
Validação é por rota (`@Body(new ZodValidationPipe(...))`). Rotas sem o pipe ficam sem validação. Não há `forbidNonWhitelisted` global.
**Fix:** pipe global de validação; auditar rotas sem schema.

---

## ALTAS

- **A1.** Sem `TenantGuard` global — isolamento depende de cada service lembrar do `tenantId` no `where`. Erro humano vira IDOR cross-tenant. ⚠️ PLAUSÍVEL → guard global que compara `user.tenantId` com o recurso.
- **A2.** IDOR em `plans.service.ts:75` — `update` faz `where: { id: planId }` sem `tenantId`. Precedido de `findPlanInTenant` (mitiga), mas o update em si deveria incluir `tenantId`. ✅ CONFIRMADO (baixo risco real por causa do find anterior; corrigir mesmo assim).
- **A3.** PII (telefone) exposto em `subscriptions.mapper.ts` / DTO de resposta. ⚠️ PLAUSÍVEL → remover `phone` do DTO.
- **A4.** Soft delete inconsistente — nem todas as queries de READ filtram `deletedAt: null`. ✅ CONFIRMADO (padrão inconsistente) → middleware Prisma ou helper `whereActive()`.
- **A5.** Dockerfile roda como root. ✅ CONFIRMADO → usuário não-root.
- **A6.** Webhook de pagamentos sem filtro `tenantId` (`payments.service.ts:150`). ✅ CONFIRMADO — risco real baixo (externalId do MP é globalmente único + assinatura validada), mas deve escopar por tenant.
- **A7.** Backoff de retry BullMQ diverge da spec (spec 008: 1/5/15min; plan: 1/2/4min; código: exponencial). ⚠️ PLAUSÍVEL → alinhar com a spec.
- **A8.** Sem DLQ / persistência de jobs falhados após 3 tentativas. ⚠️ PLAUSÍVEL.
- **A9.** `PATCH /users/:id` sem `@Roles()` (autorização só no service). ✅ CONFIRMADO — provavelmente intencional (self-update), mas inconsistente com os demais endpoints; documentar ou reforçar.
- **A10.** JWT `expiresIn`/`refreshExpiresIn` não validados no schema de env. ⚠️ PLAUSÍVEL → regex `^\d+[smhd]$`.

## Race conditions (fila / check-in) — ✅ CONFIRMADO (padrão)
- **R1.** `checkin.service.ts` — dois check-ins simultâneos do mesmo cliente criam atendimentos duplicados. Falta `$transaction` + constraint única `(tenantId, customerId, status ∈ [AGUARDANDO, EM_ATENDIMENTO])`.
- **R2.** `queuePosition` calculada fora de transação → posições inconsistentes sob concorrência.
- **R3.** Barbeiro pode ficar com múltiplos `EM_ATENDIMENTO` (TOCTOU) — `appointments.service.ts:180`.

## MÉDIAS / BAIXAS (resumo)
- Health endpoint (`@Public()`) vaza status detalhado de Postgres/Redis → retornar só UP/DOWN.
- `queues-admin` redaction não cobre `customerId`/`paymentId`/`subscriptionId`.
- Timezone não tratado nas agregações de dashboard (`date-range.util.ts`).
- `getOpenHoursInRange` conta dias inclusivamente nas duas pontas (off-by-one).
- Body size limit 2MB (alto); Helmet só com defaults; CORS `credentials:true` sem checar `*`.
- `gatewayData` do MP armazenado/retornado sem sanitização.
- Rate limiting só em login e checkin.
- `ClienteCadastradoPayload` diverge entre `events/interfaces/event-payloads.ts` e `common/events/customer.events.ts`.

## FALSO POSITIVO
- ❌ `appointment.listener.ts` "imports de caminhos inexistentes" — imports resolvem (tsc passa limpo). Refutado.

---

## Divergências de spec (consolidado)
- **007** `GET /payments/:id` inclui `BARBEIRO` nos roles sem ownership check (spec diz só "JWT").
- **003** `GET /customers/:id/history` — spec sugere BARBEIRO, plan/código só ADMIN+GERENTE (conflito spec×plan).
- **008** backoff: spec×plan×código divergem (três valores diferentes).
- **006** `Subscription.deletedAt` existe no schema mas soft-delete não é mencionado na spec.
- **008** payloads de evento inconsistentes entre definição e emissão.

## Coerência das specs (auditoria dedicada)
- **ALTA** — `specs/001` não define **contrato de paginação** (campos de resposta). Bloqueia consumo coerente pelo frontend. → Padronizar `{ data, page, perPage, total, ... }`.
- **ALTA** — Nenhum **formato de erro padrão** definido (400/401/403/404/409/422/500). → Documentar em constitution/CLAUDE.md.
- **MÉDIA** — Backoff 008 incoerente (spec×plan). Requisitos não-funcionais (001/002) sem critérios de aceite verificáveis.
- **MÉDIA** — `011` com branch naming (`feature/` vs `feat/`) e status (`Implemented` vs `Ready`) fora do padrão.
- **BAIXA** — Sem DoD formal; sem estratégia de versionamento de API (`/api/v1`).
- **RESUMO do auditor:** documentação bem estruturada e spec-driven, tasks marcadas [x], multi-tenancy presente em todas as specs, sem violação de constituição. As 3 lacunas (paginação, erro, backoff) são as prioritárias.

## npm audit — pacotes com high
`multer`, `@nestjs/core` (injection), `qs` (DoS), `webpack`, `glob`, `lodash`, `tmp`, `form-data`, `js-yaml`, `ajv`, `file-type`. Maioria transitiva (dev/build). Rodar `npm audit fix` (sem `--force`) e revisar os que exigem major.
