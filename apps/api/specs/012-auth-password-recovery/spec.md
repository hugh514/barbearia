# Feature Specification: Recuperação de Senha

**Feature Branch**: `012-auth-password-recovery`
**Created**: 2026-07-16
**Status**: Ready for Implementation

## Contexto
O backoffice precisa de fluxo de recuperação de senha (login → "esqueci a senha").
A API ainda não expõe endpoints para isso. Esta feature adiciona `POST /auth/forgot-password`
e `POST /auth/reset-password`, mantendo os princípios de segurança já auditados
(sem enumeração de usuários, tokens de uso único, efeitos colaterais fora do handler).

## User Stories

### US-012.1 - Solicitar recuperação (P1)
Usuário informa e-mail e recebe (por e-mail) um link com token de redefinição.

**Acceptance Scenarios**:
1. **Given** e-mail existente, **When** `POST /auth/forgot-password { email }`, **Then** responde `202` genérico e emite evento `SENHA_RECUPERACAO_SOLICITADA` (envio de e-mail via BullMQ).
2. **Given** e-mail inexistente, **When** solicita, **Then** responde `202` **idêntico** (não revela existência da conta).
3. Token é gerado com entropia alta, TTL de 30 min, armazenado em Redis, uso único.

### US-012.2 - Redefinir senha (P1)
Usuário com token válido define nova senha.

**Acceptance Scenarios**:
1. **Given** token válido, **When** `POST /auth/reset-password { token, password }` com senha que atende à política, **Then** senha é atualizada (bcrypt 12), token é invalidado, todas as sessões (refresh tokens) do usuário são revogadas.
2. **Given** token inválido/expirado/já usado, **When** redefine, **Then** responde `400`/`401` sem detalhar.
3. **Given** senha fraca, **When** redefine, **Then** `400` com mensagem de validação.

## Requirements
- **FR-012.1**: `POST /auth/forgot-password` público, rate-limited, resposta genérica sempre `202`.
- **FR-012.2**: Token de reset = `randomUUID` (ou 32 bytes), chave Redis `pwreset:{token}` → `{tenantId,userId}` TTL 1800s.
- **FR-012.3**: `POST /auth/reset-password` público, rate-limited; valida token via `GETDEL` (uso único atômico).
- **FR-012.4**: Ao redefinir, revogar refresh tokens do usuário (limpar chaves `refresh:{tenant}:{user}:*`).
- **FR-012.5**: Efeito de envio de e-mail via evento/fila, nunca no handler HTTP.

## Success Criteria
- **SC-012.1**: Resposta de forgot-password é indistinguível entre e-mail existente e inexistente (status + corpo + tempo).
- **SC-012.2**: Token não pode ser reutilizado.
