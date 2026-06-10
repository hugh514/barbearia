# Plano Técnico 002 — Autenticação e Autorização (RBAC)

**Input:** `specs/002-auth-rbac/spec.md`
**Constituição:** `.specify/memory/constitution.md`

---

## Verificação Constitucional

| Artigo | Status | Nota |
|--------|--------|------|
| I — API como Hub | ✅ | Auth é interno à API |
| II — Multi-tenancy | ✅ | `tenantId` no JWT, isolamento por tenant |
| III — Stack canônica | ✅ | JWT, bcrypt, Redis para refresh tokens |
| IV — Orientação a Eventos | N/A | Auth não emite eventos de negócio |
| V — Separação de módulos | ✅ | `auth/` e `users/` separados |
| VI — Segurança | ✅ | bcrypt 12 rounds, rate limiting, RBAC em guards |
| VII — Observabilidade | ✅ | Tentativas de login logadas, sem dados sensíveis |
| VIII — DB é da API | ✅ | Tabela `users` já criada em 001 |
| IX — Dev iterativo | ✅ | Depende de 001, bloqueia 003+ |
| X — Ordem de chegada | N/A | Auth é independente do modelo de atendimento |

---

## Arquitetura Técnica

### Estrutura de Diretórios

```
src/modules/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    strategies/
      jwt.strategy.ts
      jwt-refresh.strategy.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    decorators/
      roles.decorator.ts
      current-user.decorator.ts
      current-tenant.decorator.ts
      public.decorator.ts
    dto/
      login.dto.ts
      refresh.dto.ts
      login-response.dto.ts
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    dto/
      create-user.dto.ts
      update-user.dto.ts
      user-response.dto.ts
```

### Fluxo de Autenticação

```
POST /auth/login
  → Valida email + senha (bcrypt.compare)
  → Gera accessToken (JWT, 15min) com { sub, tenantId, role, email }
  → Gera refreshToken (JWT, 7d) com { sub, tenantId, jti }
  → Salva refreshToken hash no Redis (key: `refresh:{jti}`, TTL: 7d)
  → Retorna { accessToken, refreshToken }

POST /auth/refresh
  → Valida refreshToken
  → Verifica se jti existe no Redis (não revogado)
  → Deleta jti antigo do Redis
  → Gera novo par de tokens (rotação)
  → Salva novo jti no Redis
  → Retorna { accessToken, refreshToken }

POST /auth/logout
  → Extrai jti do refreshToken
  → Deleta do Redis
  → Retorna 204
```

### Schema Redis para Refresh Tokens

```
Key:    refresh:{tenantId}:{userId}:{jti}
Value:  1
TTL:    604800 (7 dias em segundos)
```

### Rate Limiting

```
Key:    ratelimit:login:{ip}
Limit:  5 tentativas por minuto
Action: Retorna 429 Too Many Requests
```

### JWT Payload

```typescript
interface JwtPayload {
  sub: string;       // userId
  tenantId: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

interface JwtRefreshPayload {
  sub: string;
  tenantId: string;
  jti: string;       // UUID único por refresh token
  iat: number;
  exp: number;
}
```

### Permissões RBAC

| Ação | ADMIN | GERENTE | BARBEIRO | CLIENTE |
|------|-------|---------|----------|---------|
| Criar ADMIN | ✅ | ❌ | ❌ | ❌ |
| Criar GERENTE | ✅ | ❌ | ❌ | ❌ |
| Criar BARBEIRO | ✅ | ✅ | ❌ | ❌ |
| Listar usuários | ✅ | ✅ | ❌ | ❌ |
| Editar próprio perfil | ✅ | ✅ | ✅ | ✅ |
| Desativar usuário | ✅ | ❌ | ❌ | ❌ |

---

## Endpoints

| Método | Rota | Descrição | Auth | Roles |
|--------|------|-----------|------|-------|
| POST | `/auth/login` | Login | Pública | — |
| POST | `/auth/refresh` | Renovar token | Pública | — |
| POST | `/auth/logout` | Encerrar sessão | JWT | Qualquer |
| GET | `/auth/me` | Perfil do usuário logado | JWT | Qualquer |
| POST | `/users` | Criar usuário interno | JWT | ADMIN, GERENTE |
| GET | `/users` | Listar usuários do tenant | JWT | ADMIN, GERENTE |
| PATCH | `/users/:id` | Atualizar usuário | JWT | ADMIN, self |
| DELETE | `/users/:id` | Desativar usuário | JWT | ADMIN |

---

## Pacotes Adicionais

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcryptjs
npm install -D @types/passport-jwt @types/bcryptjs
npm install @nestjs/throttler
```
