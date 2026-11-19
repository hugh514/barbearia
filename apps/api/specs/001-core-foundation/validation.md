# Validation 001: Core Foundation

**Feature:** `specs/001-core-foundation/spec.md`  
**Branch:** `feat/001-core-foundation`  
**Smoke:** `scripts/smoke-001.sh` → `npm run smoke:001`  
**E2E:** `test/feature-001.e2e-spec.ts` → `npm run test:e2e -- --testPathPattern=feature-001`

Use este documento após a implementação e após cada fix. Marque `[x]` ao passar.

---

## Para o agente Composer

Ao finalizar as tasks (ou em sessão de validação dedicada):

1. **Garanta** que este `validation.md` cobre todos os critérios de `spec.md`.
2. **Crie/atualize** `scripts/smoke-001.sh` para cada item com coluna Auto = `smoke`.
3. **Crie/atualize** `test/feature-001.e2e-spec.ts` para endpoints HTTP (health, correlation ID, erro padronizado).
4. **Execute** e corrija até passar:
   ```bash
   npm run build && npm run lint
   npm run smoke:001
   npm run test:e2e -- --testPathPattern=feature-001
   ```
5. **Reporte** pass/fail por ID (`V001-01` …) e liste itens `manual` para o humano.

Itens `manual` não entram no smoke, documente no relatório final.

---

## 1. Setup do projeto (US-001.1)

| ID | Teste | Como verificar | Auto |
|----|-------|----------------|------|
| V001-01 | Build TypeScript strict | `npm run build`, compila sem erros | smoke |
| V001-02 | Lint | `npm run lint` | smoke |
| V001-03 | Path aliases | Build passa com imports `@modules/*`, `@common/*`, `@prisma/*` | smoke |
| V001-04 | Validação de env | Remova `DATABASE_URL` do `.env` e suba a API, deve falhar na inicialização com erro Zod | manual |

---

## 2. Banco e Prisma (US-001.2)

| ID | Teste | Como verificar | Auto |
|----|-------|----------------|------|
| V001-05 | Migration limpa | `npx prisma migrate deploy`, sem migrations pendentes | smoke |
| V001-06 | Tabelas criadas | `npx prisma studio` ou `\dt` no psql, `tenants` e `users` existem | smoke |
| V001-07 | UUID como PK | Colunas `id` são `uuid`, não `serial` | manual |
| V001-08 | `tenant_id` em users | Coluna `tenant_id` NOT NULL com FK para `tenants` | manual |
| V001-09 | Seed | `npx prisma db seed`, tenant "Barbearia Modelo" + ADMIN `admin@barbearia.example` | smoke |

Conferir seed no banco:

```bash
npx prisma studio
# ou
docker compose exec postgres psql -U barber -d barber_db -c "SELECT name, slug FROM tenants;"
```

---

## 3. Docker (US-001.3)

| ID | Teste | Como verificar | Auto |
|----|-------|----------------|------|
| V001-10 | Stack completa | `docker compose up --build`, api, postgres e redis sobem sem erro | manual |
| V001-11 | Health via container | `curl http://localhost:3000/health` | smoke |
| V001-12 | Hot reload | Altere um arquivo em `src/` e veja recompilação nos logs (`Found 0 errors. Watching...`) | manual |
| V001-13 | Volumes persistentes | `docker compose down` → `docker compose up`, dados do postgres permanecem | manual |
| V001-14 | `.env.example` | Todas as variáveis documentadas e copiáveis para `.env` | manual |

---

## 4. Health e observabilidade (US-001.4)

| ID | Teste | Comando / expectativa | Auto |
|----|-------|----------------------|------|
| V001-15 | Health OK | `curl -s http://localhost:3000/health` → 200, `database` e `redis` com `"status":"up"` | smoke |
| V001-16 | Health com DB down | Pare o postgres → `/health` retorna 503 | manual |
| V001-17 | Health com Redis down | Pare o redis → `/health` retorna 503 | manual |
| V001-18 | Correlation ID | `curl -i http://localhost:3000/health` → header `x-correlation-id` presente | smoke |
| V001-19 | Correlation ID customizado | `curl -H "x-correlation-id: meu-id-123" http://localhost:3000/health` → mesmo ID na resposta | smoke |
| V001-20 | Erro padronizado | `curl -X POST http://localhost:3000/tenants/validate -H "Content-Type: application/json" -d '{}'` → 400 com `correlationId`, `timestamp`, `path` | smoke |
| V001-21 | Logs Pino (dev) | Logs coloridos/pretty no terminal | manual |
| V001-22 | Sentry | Com `SENTRY_DSN` configurado, force um erro 500 e confira no dashboard Sentry | manual |

---

## 5. Swagger (US-001.5)

| ID | Teste | Como verificar | Auto |
|----|-------|----------------|------|
| V001-23 | UI em dev | Abrir `http://localhost:3000/docs` → 200, UI carrega | smoke |
| V001-24 | Metadados | Título "Barber API", Bearer JWT placeholder visível | manual |
| V001-25 | DTOs documentados | Endpoints `/health` e `/tenants/validate` com `@ApiProperty` | manual |
| V001-26 | Basic Auth em prod | `NODE_ENV=production` + `SWAGGER_ENABLED=true` → `/docs` exige user/senha (`SWAGGER_USER` / `SWAGGER_PASS`) | manual |
| V001-27 | Swagger desabilitado | `SWAGGER_ENABLED=false` → `/docs` não disponível | manual |

---

## 6. Validação final: roteiro mínimo

Checklist rápido para considerar a spec **aprovada**:

```bash
# 1. Infra
docker compose up --build -d

# 2. Migrations
npx prisma migrate deploy

# 3. Seed
npx prisma db seed

# 4. Health
curl -s http://localhost:3000/health | jq

# 5. Erro com correlationId
curl -s -X POST http://localhost:3000/tenants/validate \
  -H "Content-Type: application/json" -d '{}' | jq

# 6. Swagger
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/docs

# 7. Qualidade
npm run build && npm run lint
```

Ou execute tudo de uma vez:

```bash
./scripts/smoke-001.sh
```

---

## 7. Requisitos não-funcionais

| ID | Requisito | Como verificar |
|----|-----------|----------------|
| V001-28 | Startup < 5s | Nos logs do Docker, tempo entre `Starting compilation` e `Application running on port 3000` |
| V001-29 | Node 20+ | `node -v` |
| V001-30 | NestJS 10+ / Prisma 5+ | Conferir em `package.json` |

---

## Fora de escopo (não testar nesta spec)

- JWT, login, RBAC
- Módulos de negócio além de `tenants` (endpoint de validação) e `health`

Isso pertence à **Feature 002+**.

---

## Critério de aprovação

- [ ] Todos os itens **Auto** do smoke script passam
- [ ] Roteiro mínimo (seção 6) executado com sucesso
- [ ] Itens **manual** críticos verificados: V001-04, V001-07, V001-08, V001-12 (opcional em CI)
