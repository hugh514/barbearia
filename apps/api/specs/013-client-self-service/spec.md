# Feature Specification: Autoatendimento do Cliente (painel do cliente)

**Feature Branch**: `013-client-self-service`
**Created**: 2026-07-16
**Status**: Ready for Implementation

## Contexto
O painel do cliente (fk-club-prime) precisa de: auto-cadastro, ver o próprio plano/assinatura,
ver o próprio histórico e gerar QR de check-in. A API já tem `/checkin/token`, `/plans`,
`POST /subscriptions`, `/auth/*`. Faltam endpoints "me" e cadastro público.

## Requirements
- **FR-013.1**: `POST /auth/register-client` (público, rate-limited): cria `Customer` (origin MANUAL)
  + `User` (papel CLIENTE) vinculados numa transação; retorna par de tokens. E-mail duplicado no
  tenant → 409. Senha forte (8+, maiúscula, minúscula, dígito).
- **FR-013.2**: `GET /subscriptions/me` (CLIENTE): lista as assinaturas do próprio cliente
  (resolve `customerId` a partir do usuário autenticado).
- **FR-013.3**: `GET /appointments/me` (CLIENTE): histórico de atendimentos do próprio cliente.
- **FR-013.4**: Cliente sem `customerId` vinculado → 422 nos endpoints "me".

## Success Criteria
- **SC-013.1**: Cliente recém-cadastrado consegue logar e gerar QR de check-in.
- **SC-013.2**: Cliente vê apenas os próprios dados (isolamento por `customerId` + `tenantId`).
