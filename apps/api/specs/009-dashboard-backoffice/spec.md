# Spec 009: Dashboard e Métricas do Backoffice

**Branch:** `feat/009-dashboard-backoffice`
**Status:** Ready for Implementation
**Depende de:** `008-event-system-queues`

---

## Contexto

O dono da barbearia hoje não tem nenhuma visibilidade do próprio negócio, não sabe quantos clientes tem, quanto faturou, qual barbeiro atende mais. Este módulo expõe endpoints de métricas agregadas que o frontend do backoffice consumirá. Não inclui o frontend, apenas a API de dados.

---

## User Stories

### US-009.1: Dashboard Resumo (Priority: P0)

**Como** dono/gerente,
**Quero** ver um resumo do dia/semana/mês em uma tela,
**Para que** eu tenha visibilidade instantânea do negócio.

**Critérios de Aceite:**
- [ ] `GET /dashboard/summary?period=today|week|month` retorna:
  - Total de atendimentos no período
  - Total de atendimentos por barbeiro
  - Total de clientes novos
  - Receita do período (soma de totalPrice dos atendimentos finalizados)
  - Taxa de ocupação (atendimentos / horas abertas)
- [ ] Filtro por período obrigatório
- [ ] Scoped por tenant

### US-009.2: Métricas de Clientes (Priority: P1)

**Critérios de Aceite:**
- [ ] `GET /dashboard/customers` retorna:
  - Total de clientes cadastrados
  - Clientes novos no período
  - Clientes recorrentes (2+ atendimentos)
  - Top 10 clientes por frequência

### US-009.3: Métricas Financeiras (Priority: P1)

**Critérios de Aceite:**
- [ ] `GET /dashboard/revenue?period=month` retorna:
  - Receita total de atendimentos (totalPrice)
  - Receita de planos (pagamentos aprovados)
  - Receita total combinada
  - Comparativo com período anterior (% crescimento)
  - Receita por barbeiro

### US-009.4: Métricas de Planos (Priority: P1)

**Critérios de Aceite:**
- [ ] `GET /dashboard/plans` retorna:
  - Total de assinantes ativos
  - Total de cancelamentos no período
  - MRR (Monthly Recurring Revenue)
  - Churn rate (cancelados / ativos)

### US-009.5: Métricas de Conversas (Priority: P2)

**Critérios de Aceite:**
- [ ] `GET /dashboard/conversations` retorna:
  - Conversas abertas agora
  - Conversas aguardando humano
  - Total de mensagens no período por canal (WhatsApp vs Instagram)
  - Tempo médio de resposta

### US-009.6: Performance por Barbeiro (Priority: P1)

**Critérios de Aceite:**
- [ ] `GET /dashboard/barbers` retorna por barbeiro:
  - Total de atendimentos no período
  - Tempo médio de atendimento
  - Receita gerada
  - Avaliação média (quando módulo de reviews existir)

---

## Modelo de Dados

Não há novas tabelas, este módulo faz queries de agregação sobre tabelas existentes.

Queries pesadas devem usar:
- Cache em Redis (TTL: 5 min para dashboard, 15 min para relatórios)
- Agregações via Prisma `groupBy`, `count`, `sum`

---

## Endpoints

| Método | Rota | Roles |
|--------|------|-------|
| GET | `/dashboard/summary` | ADMIN, GERENTE |
| GET | `/dashboard/customers` | ADMIN, GERENTE |
| GET | `/dashboard/revenue` | ADMIN, GERENTE |
| GET | `/dashboard/plans` | ADMIN, GERENTE |
| GET | `/dashboard/conversations` | ADMIN, GERENTE |
| GET | `/dashboard/barbers` | ADMIN, GERENTE |

---

## Fora de Escopo

- Frontend do backoffice (será outro repositório)
- Exportação CSV/PDF
- Relatórios customizados
- Gráficos (responsabilidade do frontend)
