# Spec 005: Atendimentos (Walk-in / Ordem de Chegada)

**Branch:** `feat/005-appointments-attendance`
**Status:** Ready for Implementation
**Depende de:** `003-customer-crm`

---

## Contexto

A Barbearia Modelo opera por ordem de chegada, não há agendamento prévio. O cliente chega, é registrado na fila, e é atendido por um dos 3 barbeiros conforme disponibilidade. Este módulo registra cada atendimento para fins de histórico, métricas e pós-atendimento automatizado. Toda alteração de status fica registrada.

---

## User Stories

### US-005.1: Registrar Chegada do Cliente (Priority: P0)

**Como** barbeiro ou gerente,
**Quero** registrar que um cliente chegou à barbearia,
**Para que** ele entre na fila e tenha o atendimento rastreado.

**Critérios de Aceite:**
- [ ] `POST /appointments` aceita: `customerId`, `services[]` opcional (serviços pedidos; sem ele, `[]` e os serviços entram ao finalizar)
- [ ] Status inicial: `AGUARDANDO`
- [ ] `tenantId` inferido do JWT
- [ ] Se cliente não existe, retorna 404 (cadastro é responsabilidade do módulo 003)
- [ ] Registra `createdAt` como timestamp de chegada

### US-005.2: Iniciar Atendimento (Priority: P0)

**Como** barbeiro,
**Quero** marcar que estou atendendo um cliente da fila,
**Para que** o sistema saiba quem está sendo atendido e por quem.

**Critérios de Aceite:**
- [ ] `PATCH /appointments/:id/start` muda status para `EM_ATENDIMENTO`
- [ ] Registra `barberId` (userId do barbeiro que iniciou)
- [ ] Registra `startedAt` timestamp
- [ ] Só pode iniciar se status atual é `AGUARDANDO`
- [ ] Barbeiro só pode ter 1 atendimento `EM_ATENDIMENTO` por vez

### US-005.3: Finalizar Atendimento (Priority: P0)

**Como** barbeiro,
**Quero** marcar que terminei o atendimento,
**Para que** o sistema registre o serviço e dispare automações.

**Critérios de Aceite:**
- [ ] `PATCH /appointments/:id/finish` muda status para `FINALIZADO`
- [ ] Registra `finishedAt` timestamp
- [ ] Aceita campo opcional `notes` (observações do barbeiro)
- [ ] Aceita campo opcional `totalPrice` (valor cobrado)
- [ ] Emite evento `ATENDIMENTO_FINALIZADO` para a fila (Feature 008)
- [ ] Só pode finalizar se status é `EM_ATENDIMENTO`

### US-005.4: Cancelar Atendimento (Priority: P1)

**Como** barbeiro ou gerente,
**Quero** cancelar um atendimento (cliente desistiu),
**Para que** a fila fique correta.

**Critérios de Aceite:**
- [ ] `PATCH /appointments/:id/cancel` muda status para `CANCELADO`
- [ ] Aceita campo `reason` (opcional)
- [ ] Pode cancelar se status é `AGUARDANDO` ou `EM_ATENDIMENTO`
- [ ] `FINALIZADO` não pode ser cancelado

### US-005.5: Visualizar Fila Atual (Priority: P0)

**Como** barbeiro ou gerente,
**Quero** ver quem está na fila e quem está sendo atendido agora,
**Para que** eu gerencie o fluxo do dia.

**Critérios de Aceite:**
- [ ] `GET /appointments/queue` retorna atendimentos do dia com status `AGUARDANDO` e `EM_ATENDIMENTO`
- [ ] Ordenado por `createdAt` (quem chegou primeiro aparece primeiro)
- [ ] Inclui: cliente (nome, telefone), serviços, barbeiro (se em atendimento), tempo de espera

### US-005.6: Histórico de Atendimentos (Priority: P1)

**Como** gerente ou admin,
**Quero** ver o histórico de atendimentos com filtros,
**Para que** eu analise performance e volume.

**Critérios de Aceite:**
- [ ] `GET /appointments` com filtros: `barberId`, `customerId`, `status`, `dateFrom`, `dateTo`
- [ ] Paginado (padrão 20 por página)
- [ ] Inclui: cliente, barbeiro, serviços, valor, duração (finishedAt - startedAt)

---

## Modelo de Dados

```
Appointment:
  id            UUID PK
  tenant_id     UUID FK → tenants
  customer_id   UUID FK → customers
  barber_id     UUID? FK → users (preenchido ao iniciar)
  status        Enum: AGUARDANDO | EM_ATENDIMENTO | FINALIZADO | CANCELADO
  services      String[] (array de nomes de serviços)
  total_price   Decimal? (preenchido ao finalizar)
  notes         String?
  cancel_reason String?
  started_at    DateTime?
  finished_at   DateTime?
  created_at    DateTime (= hora de chegada)
  updated_at    DateTime

  INDEX(tenant_id, status)
  INDEX(tenant_id, barber_id)
  INDEX(tenant_id, customer_id)
  INDEX(tenant_id, created_at)
```

---

## Eventos Emitidos

| Evento | Quando |
|--------|--------|
| `ATENDIMENTO_INICIADO` | Status muda para EM_ATENDIMENTO |
| `ATENDIMENTO_FINALIZADO` | Status muda para FINALIZADO |

---

## Fora de Escopo

- Agendamento prévio (proibido pelo Artigo X da constituição)
- Cálculo automático de preço por serviço (futuro)
- Fila com prioridade (todos são ordem de chegada)
