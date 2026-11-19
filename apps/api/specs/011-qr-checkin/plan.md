# Plano Técnico 011: Check-in por QR Code

**Branch**: `011-qr-checkin` | **Data**: 2026-06-11 | **Spec**: `specs/011-qr-checkin/spec.md`

---

## Resumo

Módulo `checkin` que expõe dois endpoints: um para clientes gerarem um token efêmero de check-in (armazenado exclusivamente no Redis, TTL 60 s) e outro para barbeiros/atendentes consumirem o token de forma atômica, identificando o cliente e criando um atendimento walk-in na fila do dia, ou retornando o atendimento aberto existente (idempotência). Nenhuma tabela nova no banco relacional. Evento de domínio `CHECKIN_REALIZADO` publicado via `EventEmitter2` e processado de forma assíncrona pela fila BullMQ, sem efeito colateral no handler HTTP.

---

## Contexto Técnico

**Linguagem/Versão**: TypeScript 5.x · Node.js 20 LTS

**Framework**: NestJS 10+

**Dependências primárias**: Prisma 5+ (leitura de `Customer` e `Appointment`), ioredis (acesso direto via `REDIS_CLIENT`), `@nestjs/event-emitter` (EventEmitter2), BullMQ / `@nestjs/bullmq`, Zod (validação de DTOs), `crypto.randomBytes`

**Armazenamento de tokens**: Redis exclusivamente, chave `checkin:{tenantId}:{token}` → `customerId`, TTL 60 s; chave reversa `checkin:customer:{tenantId}:{customerId}` → token atual (para invalidação na regeneração)

**Banco relacional**: Sem migrations novas. Leitura de `customer` (campo `active`) e criação de `Appointment` via `PrismaService` já existente.

**Testes**: Jest e2e com Supertest, arquivo `test/feature-011.e2e-spec.ts`

**Plataforma**: Linux server · Docker Compose (PostgreSQL 16 + Redis 7)

**Metas de desempenho**: Fluxo completo gerar+consumir < 15 s (SC-001); token expira em ≤ 90 s (SC-002)

**Restrições**: Token nunca persistido no banco; consumo atômico via `GETDEL` (ioredis) para garantir uso único sob concorrência; sem agendamento (Artigo X)

---

## Verificação Constitucional

| Artigo | Status | Nota |
|--------|--------|------|
| I, API como Hub Central | sim | App mobile e backoffice chamam exclusivamente a API; Redis é interno à API |
| II, Multi-tenancy desde o Início | sim | Chaves Redis prefixadas com `tenantId`; toda query Prisma filtra `tenantId`; consumo valida que o token pertence ao tenant do usuário autenticado |
| III, Stack Canônica | sim | ioredis (já no projeto via `REDIS_CLIENT`), NestJS, Prisma, BullMQ, EventEmitter2, Zod, sem tecnologias novas |
| IV, Orientação a Eventos | sim | Evento `CHECKIN_REALIZADO` emitido via `EventEmitter2` após criação do atendimento; listener despacha job BullMQ; nenhuma notificação ou side-effect no handler HTTP |
| V, Separação de Responsabilidades | sim | Novo módulo `checkin` isolado; acessa `AppointmentsService` (para criar atendimento e calcular fila) e `PrismaService` (leitura de customer); não acessa repositórios de outros módulos diretamente |
| VI, Segurança por Design | sim | `POST /checkin/token` requer CLIENTE; `POST /checkin/consume` requer ADMIN/GERENTE/BARBEIRO; rate limiting `@Throttle` em ambos; erros genéricos sem vazar existência de token; dados sensíveis fora dos logs |
| VII, Observabilidade | sim | Logger Pino herdado do contexto NestJS; token nunca logado; Swagger documentado; Sentry captura exceções não tratadas |
| VIII, Banco é Responsabilidade da API | sim | Sem migration nova (token não persiste no banco); `Appointment` já existe e é criado via `PrismaService` |
| IX, Desenvolvimento Iterativo | sim | Feature 011 inicia após 010 estar completa; spec.md aprovada antes deste plan |
| X, Ordem de Chegada (walk-in) | CRÍTICO | O check-in cria `Appointment` com `status: AGUARDANDO` e sem nenhum campo de horário agendado; posição na fila é derivada de `createdAt ASC` do dia corrente, idêntico à Feature 005; PROIBIDO qualquer slot ou lógica de calendário |

---

## Estrutura de Diretórios

### Documentação (esta feature)

```text
specs/011-qr-checkin/
├── spec.md           # Especificação aprovada
├── plan.md           # Este arquivo
└── tasks.md          # Gerado a seguir
```

### Código-fonte (novo módulo)

```text
src/modules/checkin/
├── checkin.module.ts
├── checkin.controller.ts
├── checkin.service.ts
└── dto/
    ├── generate-token-response.dto.ts
    ├── consume-token.dto.ts
    └── checkin-response.dto.ts

src/common/events/
└── checkin.events.ts          # CHECKIN_REALIZADO + CheckinRealizadoPayload

test/
└── feature-011.e2e-spec.ts
```

> O módulo `checkin` importa `PrismaModule` (já global), `RedisModule` (já global) e `AppointmentsModule` (para reutilizar `AppointmentsService`).

---

## Decisões de Design

### 1. Geração de token: `POST /checkin/token`

**Role exigida**: `CLIENTE`

**Identificação do cliente**: O JWT do cliente tem `userId`; o `User` tem `customerId` (FK opcional para `Customer`). O service busca `user.customerId` via `PrismaService` e valida que o customer existe, pertence ao mesmo `tenantId` e está ativo (`active: true`). Se o user não tiver `customerId` vinculado, retorna 422 com mensagem clara ("Usuário sem cadastro de cliente vinculado").

**Geração do token**: `crypto.randomBytes(32).toString('hex')`, 64 chars hex, opaco, sem dados pessoais.

**Lógica Redis**:
```
1. Buscar chave reversa: GET checkin:customer:{tenantId}:{customerId}
2. Se existir token anterior → DEL checkin:{tenantId}:{tokenAnterior}
3. SET checkin:{tenantId}:{novoToken}  {customerId}  EX 60
4. SET checkin:customer:{tenantId}:{customerId}  {novoToken}  EX 65
   (TTL ligeiramente maior para garantir janela de limpeza na próxima regeneração)
```

Operações 2-4 executadas via pipeline Redis (atomicidade suficiente para invalidação, race condition de dupla regeneração simultânea é tolerável e resulta em exatamente um token válido no final).

**Resposta**:
```json
{
  "token": "<64-char-hex>",
  "expiresInSeconds": 60
}
```

---

### 2. Consumo atômico: `POST /checkin/consume`

**Role exigida**: `ADMIN`, `GERENTE`, `BARBEIRO`

**Payload**:
```json
{ "token": "<string>" }
```

**Fluxo**:
```
1. GETDEL checkin:{tenantId}:{token}  → customerId | null
   - null: retorna 404 genérico ("Token inválido ou expirado")
   - customerId encontrado: continuar
2. Limpar chave reversa: DEL checkin:customer:{tenantId}:{customerId}
3. Buscar customer: WHERE id = customerId AND tenantId = tenantId AND active = true
   - não encontrado/inativo: retorna 422 ("Cliente não encontrado ou inativo")
4. Verificar atendimento aberto do dia (idempotência):
   SELECT * FROM appointments
   WHERE tenantId = X AND customerId = Y
     AND status IN ('AGUARDANDO', 'EM_ATENDIMENTO')
     AND createdAt >= startOfDay AND createdAt <= endOfDay
   - encontrado → usar atendimento existente (reused = true)
   - não encontrado → criar novo Appointment (status AGUARDANDO)
5. Calcular posição na fila:
   SELECT count(*) FROM appointments
   WHERE tenantId = X AND status IN ('AGUARDANDO', 'EM_ATENDIMENTO')
     AND createdAt >= startOfDay AND createdAt <= endOfDay
     AND createdAt <= appointment.createdAt
   → queuePosition = count
6. Emitir evento CHECKIN_REALIZADO via eventEmitter.emit(...)
7. Responder com appointment + queuePosition + reused
```

**Atomicidade do consumo**: `GETDEL` é atômico no Redis. Dois consumos simultâneos do mesmo token: exatamente um recebe `customerId`, o outro recebe `null` e é recusado, garantia de uso único (FR-008).

**Resposta**:
```json
{
  "appointment": { /* AppointmentResponseDto */ },
  "queuePosition": 3,
  "reused": false
}
```

---

### 3. Evento de Domínio: `CHECKIN_REALIZADO`

Definido em `src/common/events/checkin.events.ts`:

```typescript
export const CHECKIN_REALIZADO = 'CHECKIN_REALIZADO';

export interface CheckinRealizadoPayload {
  tenantId: string;
  customerId: string;
  appointmentId: string;
  reused: boolean;
  checkedInAt: Date;
}
```

O listener `CheckinListener` (em `src/queue/listeners/checkin.listener.ts`) escuta `CHECKIN_REALIZADO` e despacha um job para a fila BullMQ `checkin` (processador futuro para notificações, métricas etc.). Seguindo o padrão de `appointment.listener.ts`.

---

### 4. Rate Limiting

```typescript
@Throttle({ checkin: { limit: 10, ttl: 60000 } })  // POST /checkin/token
@Throttle({ checkin: { limit: 30, ttl: 60000 } })  // POST /checkin/consume
```

Os nomes de throttler seguem o padrão do projeto (`login` em auth). O Redis do throttler é o mesmo `REDIS_CLIENT` global.

---

### 5. Multi-tenancy e Segurança

- Chaves Redis sempre incluem `tenantId`, isolamento completo entre barbearias.
- `GETDEL` retorna o `customerId` armazenado, mas o service ainda valida que `customer.tenantId === tenantId` do JWT (defesa em profundidade contra chave Redis corrompida).
- Erros de token inválido, expirado e cross-tenant retornam o mesmo `404` genérico (FR-004).
- Token nunca aparece em logs de aplicação (apenas comprimento/prefixo em debug se necessário).

---

### 6. Sem Migration Prisma

Não há tabela nova. O módulo `checkin` usa:
- `PrismaService` para ler `user.customerId`, ler `Customer`, criar/ler `Appointment`
- `REDIS_CLIENT` (ioredis injetado) para operações efêmeras

---

## Endpoints

| Método | Rota | Roles | Descrição |
|--------|------|-------|-----------|
| POST | `/checkin/token` | CLIENTE | Gera ou regenera token efêmero de check-in |
| POST | `/checkin/consume` | ADMIN, GERENTE, BARBEIRO | Consome token, cria/retorna atendimento walk-in |

---

## Estrutura de Respostas de Erro

| Cenário | HTTP | Corpo |
|---------|------|-------|
| Token inválido / expirado / cross-tenant | 404 | `{ "message": "Token inválido ou expirado" }` |
| Cliente sem vínculo de customer | 422 | `{ "message": "Usuário sem cadastro de cliente vinculado" }` |
| Cliente inativo | 422 | `{ "message": "Cliente não encontrado ou inativo" }` |
| Role insuficiente | 403 | `{ "message": "Insufficient permissions" }` |
| Redis indisponível | 503 | `{ "message": "Serviço temporariamente indisponível" }` |

---

## Dependências de Módulos NestJS

```
CheckinModule
  imports:
    - PrismaModule (global, já disponível)
    - RedisModule  (global, já disponível)
    - AppointmentsModule (para AppointmentsService)
    - EventEmitterModule (global, já disponível)
  providers:
    - CheckinService
    - CheckinController (não é provider, mas declarado no @Module)
  controllers:
    - CheckinController
```

O `CheckinModule` é registrado em `AppModule`.

---

## Cobertura de Requisitos Funcionais

| FR | Coberto por |
|----|-------------|
| FR-001 | `POST /checkin/token` com `@Roles(CLIENTE)` |
| FR-002 | Token 32 bytes hex, TTL 60 s, invalidação via chave reversa na regeneração |
| FR-003 | `POST /checkin/consume` com `@Roles(ADMIN, GERENTE, BARBEIRO)` |
| FR-004 | `GETDEL` + validação tenant + resposta 404 genérica |
| FR-005 | Criação de `Appointment` com `status: AGUARDANDO`, sem campos de agendamento (Artigo X) |
| FR-006 | Busca por atendimento aberto do dia antes de criar (idempotência) |
| FR-007 | Cálculo de `queuePosition` por count na fila do dia |
| FR-008 | `GETDEL` atômico garante exatamente um vencedor em concorrência |
| FR-009 | `eventEmitter.emit(CHECKIN_REALIZADO, payload)` após criação; listener despacha BullMQ |
| FR-010 | Token em Redis com TTL; sem coluna no banco relacional |
| FR-011 | `tenantId` em todas as chaves Redis e queries Prisma |
