# Spec 002 — Autenticação e Autorização (RBAC)

**Branch:** `feat/002-auth-rbac`
**Status:** Ready for Implementation
**Depende de:** `001-core-foundation`

---

## Contexto

Com a infraestrutura base pronta, o próximo passo é implementar autenticação e autorização. Todo endpoint de negócio será protegido por JWT. O RBAC garante que cada perfil acesse apenas o que é permitido.

---

## User Stories

### US-002.1 — Login de Usuário Interno (Priority: P0)

**Como** barbeiro, gerente ou admin,
**Quero** fazer login com email e senha,
**Para que** eu possa acessar o sistema de acordo com meu perfil.

**Critérios de Aceite:**
- [ ] `POST /auth/login` aceita `email` e `password`
- [ ] Retorna `accessToken` (JWT, 15min) e `refreshToken` (JWT, 7 dias)
- [ ] Senha incorreta retorna 401 genérico (sem revelar se email existe)
- [ ] Token contém: `sub` (userId), `tenantId`, `role`, `email`
- [ ] Usuário inativo não consegue logar (retorna 401)

### US-002.2 — Refresh de Token (Priority: P0)

**Como** usuário autenticado,
**Quero** renovar meu access token sem precisar logar novamente,
**Para que** minha sessão continue ativa.

**Critérios de Aceite:**
- [ ] `POST /auth/refresh` aceita `refreshToken` no body
- [ ] Retorna novo `accessToken` e novo `refreshToken` (rotação)
- [ ] Refresh token inválido ou expirado retorna 401
- [ ] Refresh token já utilizado retorna 401 (replay prevention)

### US-002.3 — Logout (Priority: P1)

**Como** usuário autenticado,
**Quero** encerrar minha sessão,
**Para que** meu token não possa ser reutilizado.

**Critérios de Aceite:**
- [ ] `POST /auth/logout` invalida o refresh token atual
- [ ] Requer `accessToken` válido no header
- [ ] Após logout, refresh token não pode ser usado

### US-002.4 — Proteção de Rotas por Perfil (Priority: P0)

**Como** sistema,
**Quero** que cada rota seja acessível apenas pelos perfis corretos,
**Para que** um barbeiro não acesse funcionalidades de admin.

**Critérios de Aceite:**
- [ ] Decorator `@Roles(UserRole.ADMIN, UserRole.GERENTE)` funciona em qualquer controller
- [ ] Acesso com perfil insuficiente retorna 403
- [ ] Token expirado retorna 401
- [ ] Token ausente retorna 401

### US-002.5 — Isolamento por Tenant (Priority: P0)

**Como** sistema,
**Quero** que usuários de um tenant não acessem dados de outro,
**Para que** a privacidade entre barbearias seja garantida.

**Critérios de Aceite:**
- [ ] O `tenantId` é extraído do JWT, não do body ou query
- [ ] Tentativa de acessar dados de outro tenant retorna 403
- [ ] Decorator `@CurrentTenant()` disponível em controllers

### US-002.6 — Criação de Usuário Interno (Priority: P0)

**Como** admin,
**Quero** criar novos usuários no meu tenant,
**Para que** minha equipe possa acessar o sistema.

**Critérios de Aceite:**
- [ ] `POST /users` cria usuário com nome, email, senha e role
- [ ] ADMIN pode criar ADMIN e GERENTE
- [ ] ADMIN e GERENTE podem criar BARBEIRO
- [ ] Email duplicado no tenant retorna 409
- [ ] Senha armazenada com bcrypt (mínimo 12 rounds)

---

## Requisitos Não-Funcionais

- Refresh tokens armazenados no Redis (revogação instantânea)
- Rate limiting em `/auth/login`: máx 5 tentativas/IP/min
- Nenhum dado sensível nos logs

---

## Fora de Escopo

- Autenticação de clientes (app mobile) — futuro
- OAuth / Login social
- 2FA
