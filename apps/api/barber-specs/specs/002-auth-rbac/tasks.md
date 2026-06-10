# Tasks 002 — Autenticação e Autorização (RBAC)

**Input:** `specs/002-auth-rbac/plan.md`

---

## Fase 1 — JWT e Login

- [ ] T002-01 Instalar dependências: `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`, `bcryptjs`
- [ ] T002-02 Criar `AuthModule` com imports de `JwtModule` e `PassportModule`
- [ ] T002-03 Criar `JwtStrategy` que extrai payload do access token e valida `tenantId`
- [ ] T002-04 Criar `JwtRefreshStrategy` para validar refresh tokens
- [ ] T002-05 Criar `JwtAuthGuard` como guard padrão global
- [ ] T002-06 Criar decorator `@Public()` para marcar rotas que não requerem auth
- [ ] T002-07 Implementar `AuthService.login()` com validação bcrypt e geração de tokens
- [ ] T002-08 Implementar `POST /auth/login` no controller com validação Zod
- [ ] T002-09 Testar: login com credenciais válidas retorna tokens
- [ ] T002-10 Testar: login com senha errada retorna 401 genérico

## Fase 2 — Refresh Token e Logout

- [ ] T002-11 Implementar storage de refresh tokens no Redis com TTL de 7 dias
- [ ] T002-12 Implementar `AuthService.refresh()` com rotação de token (deleta antigo, cria novo)
- [ ] T002-13 Implementar `POST /auth/refresh` no controller
- [ ] T002-14 Implementar `POST /auth/logout` que deleta refresh token do Redis
- [ ] T002-15 Testar: refresh com token válido retorna novo par
- [ ] T002-16 Testar: refresh com token já usado retorna 401 (replay prevention)
- [ ] T002-17 Testar: logout invalida refresh token

## Fase 3 — RBAC

- [ ] T002-18 Criar decorator `@Roles(UserRole.ADMIN, UserRole.GERENTE)` 
- [ ] T002-19 Criar `RolesGuard` que verifica role do JWT contra roles requeridos
- [ ] T002-20 Criar decorator `@CurrentUser()` que extrai user do request
- [ ] T002-21 Criar decorator `@CurrentTenant()` que extrai tenantId do JWT
- [ ] T002-22 Registrar `JwtAuthGuard` e `RolesGuard` como guards globais no app
- [ ] T002-23 Testar: acesso com role insuficiente retorna 403
- [ ] T002-24 Testar: token expirado retorna 401
- [ ] T002-25 Testar: token ausente retorna 401

## Fase 4 — CRUD de Usuários

- [ ] T002-26 Criar `UsersModule`, `UsersService`, `UsersController`
- [ ] T002-27 Implementar `POST /users` com validação de role hierarchy (ADMIN cria ADMIN/GERENTE, GERENTE cria BARBEIRO)
- [ ] T002-28 Implementar `GET /users` com listagem paginada filtrada por tenant
- [ ] T002-29 Implementar `PATCH /users/:id` para atualização parcial
- [ ] T002-30 Implementar `DELETE /users/:id` como soft-disable (active = false)
- [ ] T002-31 Implementar `GET /auth/me` que retorna dados do usuário logado
- [ ] T002-32 Testar: BARBEIRO não pode criar outros usuários
- [ ] T002-33 Testar: email duplicado no tenant retorna 409

## Fase 5 — Rate Limiting e Segurança

- [ ] T002-34 Instalar e configurar `@nestjs/throttler` com Redis store
- [ ] T002-35 Aplicar rate limit em `POST /auth/login`: 5 req/min por IP
- [ ] T002-36 Garantir que senhas nunca apareçam em logs (interceptor de sanitização)
- [ ] T002-37 Testar: 6ª tentativa de login no mesmo minuto retorna 429
- [ ] T002-38 Atualizar Swagger com todos os endpoints de auth e users

## Fase 6 — Validação Final

- [ ] T002-39 Login funcional com geração de JWT
- [ ] T002-40 Refresh token funcional com rotação
- [ ] T002-41 RBAC bloqueia acesso por perfil corretamente
- [ ] T002-42 Isolamento de tenant: usuário não acessa dados de outro tenant
- [ ] T002-43 Rate limiting ativo em login
- [ ] T002-44 Swagger documentado com bearer auth
