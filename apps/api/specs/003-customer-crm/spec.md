# Spec 003: Gestão de Clientes e CRM Automático

**Branch:** `feat/003-customer-crm`
**Status:** Ready for Implementation
**Depende de:** `002-auth-rbac`

---

## Contexto

Clientes são o coração do negócio. Esta feature cobre o cadastro manual (pelo backoffice), o CRM automático (quando um cliente chega via WhatsApp ou Instagram pela primeira vez) e as operações de busca e histórico. Todo cliente pertence a um tenant.

---

## User Stories

### US-003.1: Cadastro Manual de Cliente (Priority: P0)

**Como** barbeiro ou gerente,
**Quero** cadastrar um cliente manualmente,
**Para que** ele exista no sistema antes mesmo de entrar em contato pelo WhatsApp.

**Critérios de Aceite:**
- [ ] `POST /customers` aceita: nome, telefone, instagram (opcional), origem
- [ ] Retorna o cliente criado com ID
- [ ] Telefone duplicado no mesmo tenant retorna 409
- [ ] Campo `origin` aceita: `MANUAL`, `WHATSAPP`, `INSTAGRAM`
- [ ] Campo `tenantId` inferido do JWT, nunca do body

### US-003.2: CRM Automático (Upsert por Telefone) (Priority: P0)

**Como** sistema (integração WhatsApp/Instagram),
**Quero** criar um cliente automaticamente quando uma nova mensagem chega de número desconhecido,
**Para que** nenhum contato seja perdido.

**Critérios de Aceite:**
- [ ] `POST /customers/upsert` aceita: telefone, nome (opcional), origin
- [ ] Se telefone já existe no tenant: retorna cliente existente
- [ ] Se não existe: cria novo cliente
- [ ] Endpoint protegido por API key interna
- [ ] Evento `CLIENTE_CADASTRADO` emitido apenas na criação

### US-003.3: Busca de Clientes (Priority: P0)

**Como** barbeiro, gerente ou admin,
**Quero** buscar clientes por nome, telefone ou Instagram,
**Para que** eu encontre rapidamente quem preciso.

**Critérios de Aceite:**
- [ ] `GET /customers?search=texto` busca em nome, telefone e Instagram
- [ ] Resultados paginados (padrão: 20 por página)
- [ ] Busca funciona com telefone parcial
- [ ] Resultados apenas do tenant do usuário autenticado

### US-003.4: Perfil do Cliente (Priority: P1)

**Como** barbeiro ou gerente,
**Quero** ver todos os dados de um cliente específico,
**Para que** eu tenha contexto antes de atendê-lo.

**Critérios de Aceite:**
- [ ] `GET /customers/:id` retorna perfil completo
- [ ] Inclui: dados pessoais, últimos 10 atendimentos, plano ativo, origem
- [ ] Acesso a cliente de outro tenant retorna 404 (não 403)

### US-003.5: Atualização de Cliente (Priority: P1)

**Critérios de Aceite:**
- [ ] `PATCH /customers/:id` aceita: nome, telefone, instagram
- [ ] Partial update, apenas campos enviados
- [ ] Telefone duplicado com outro cliente retorna 409

### US-003.6: Histórico do Cliente (Priority: P2)

**Critérios de Aceite:**
- [ ] `GET /customers/:id/history` retorna atendimentos paginados
- [ ] `GET /customers/:id/conversations` retorna conversas paginadas

---

## Modelo de Dados

```
Customer:
  id            UUID PK
  tenant_id     UUID FK → tenants
  name          String
  phone         String
  instagram_id  String?
  instagram_user String?
  origin        Enum: MANUAL | WHATSAPP | INSTAGRAM
  plan_status   Enum: NONE | ACTIVE | PENDING | OVERDUE | CANCELLED
  last_visit    DateTime?
  created_at    DateTime
  updated_at    DateTime

  UNIQUE(tenant_id, phone)
  INDEX(tenant_id)
  INDEX(tenant_id, phone)
```

---

## Fora de Escopo

- Soft delete
- Importação em bulk
- Tags e segmentação
