# Constituição do Projeto: Barber API

> Este documento define os princípios inegociáveis que governam todo o desenvolvimento da API.
> Toda especificação, plano técnico e tarefa gerada deve estar em conformidade com esta constituição.
> Nenhuma decisão técnica pode contradizer os artigos aqui definidos.

---

## Artigo I: API como Hub Central

**Princípio:** Nenhum sistema se comunica diretamente com outro. Toda comunicação passa pela API.

**Implicações:**
- WhatsApp, Instagram, Backoffice, App Mobile e IA são consumidores da API, nunca pares entre si.
- A IA nunca acessa o banco de dados diretamente. Toda consulta passa pela API.
- Webhooks externos (Evolution API, gateways de pagamento) chegam à API e só à API.
- O banco de dados é privado da API, nenhum serviço externo tem acesso direto.

**Verificação:** Qualquer spec que proponha comunicação direta entre dois sistemas não-API viola este artigo.

---

## Artigo II: Multi-Tenancy desde o Início

**Princípio:** O sistema nasce preparado para múltiplas barbearias, sem refatoração futura.

**Implicações:**
- Toda tabela do banco deve conter `tenant_id UUID NOT NULL`.
- Toda query deve filtrar por `tenant_id`, sem exceções.
- Toda rota autenticada deve inferir o `tenant_id` pelo token JWT.
- Nunca retornar dados de um tenant para outro, isso é uma falha de segurança crítica.
- O modelo de dados deve suportar: 1 tenant = 1 barbearia; 1 tenant pode ter múltiplas unidades no futuro.

**Verificação:** Qualquer entidade proposta sem `tenant_id` viola este artigo.

---

## Artigo III: Stack Canônica

**Princípio:** A stack é definida e não deve ser substituída sem decisão explícita documentada.

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Framework | NestJS | Modular, TypeScript nativo, DI robusto |
| ORM | Prisma | Type-safe, migrations, PostgreSQL |
| Banco | PostgreSQL | JSON nativo, FTS, escalável, open source |
| Cache / Sessões / Rate Limit | Redis | Padrão de mercado para cache e filas |
| Filas | BullMQ + Redis | Jobs assíncronos pós-atendimento |
| Autenticação | JWT + Refresh Token | Stateless, suporta múltiplos clientes |
| Autorização | RBAC | Perfis: ADMIN, GERENTE, BARBEIRO, CLIENTE |
| Documentação | Swagger (OpenAPI) | Integrado ao NestJS |
| Real-time | Socket.IO | Backoffice ao vivo |
| Logs | Pino | Performático, estruturado |
| Monitoramento | Sentry + OpenTelemetry | Rastreamento de erros e traces |
| Uploads | Cloudflare R2 (S3 compat.) | Gratuito até limites generosos |
| Containerização | Docker + Docker Compose | Dev e deploy padronizados |

**Verificação:** Qualquer spec que proponha tecnologia fora desta tabela deve justificar explicitamente.

---

## Artigo IV: Orientação a Eventos

**Princípio:** Ações que geram efeitos colaterais nunca devem bloquear a requisição principal.

**Eventos canônicos do sistema:**
```
CLIENTE_CADASTRADO
MENSAGEM_RECEBIDA
ATENDIMENTO_INICIADO
ATENDIMENTO_FINALIZADO
PLANO_ASSINADO
PLANO_CANCELADO
PAGAMENTO_APROVADO
PAGAMENTO_RECUSADO
```

**Implicações:**
- Quando um atendimento é finalizado, o job de envio de WhatsApp + pedido de avaliação + oferta de plano vai para a fila, nunca no handler HTTP.
- O sistema de eventos é interno à API via BullMQ.
- Eventos podem ser re-processados em caso de falha (retries com backoff).

**Verificação:** Qualquer spec que coloque lógica de notificação ou integração dentro do handler HTTP viola este artigo.

---

## Artigo V: Separação de Responsabilidades por Módulo

**Princípio:** Cada módulo tem responsabilidade única e não acessa repositórios de outros módulos diretamente.

**Estrutura de módulos canônica:**
```
src/
  modules/
    auth/          , JWT, login, refresh, guards
    users/         , usuários internos (barbeiros, admin, gerente)
    tenants/       , gestão de barbearias/tenants
    customers/     , clientes + CRM automático
    conversations/ , histórico de conversas omnichannel
    messages/      , mensagens individuais por conversa
    whatsapp/      , webhook + integração Evolution API
    instagram/     , webhook + DM Instagram
    plans/         , definição de planos disponíveis
    subscriptions/ , assinaturas de clientes
    payments/      , integração com gateway
    barbers/       , perfis de barbeiros
    appointments/  , atendimentos walk-in (ordem de chegada)
    dashboard/     , métricas agregadas
    notifications/ , disparo de mensagens e eventos
  common/          , guards, decorators, pipes, interceptors
  prisma/          , PrismaService, PrismaModule
  queue/           , configuração BullMQ, processors
  events/          , EventEmitter interno
```

**Verificação:** Módulos não devem importar repositórios de outros módulos, use serviços ou eventos.

---

## Artigo VI: Segurança por Design

**Princípio:** Segurança é implementada na camada da API, não nos clientes.

**Implicações:**
- Todo endpoint (exceto webhooks públicos e rotas de auth) requer JWT válido.
- Webhooks externos usam verificação de assinatura (HMAC) ou secret token fixo por tenant.
- Rate limiting em todas as rotas públicas via Redis.
- Dados sensíveis (tokens, secrets) nunca em logs.
- Senhas com bcrypt, mínimo 12 rounds.
- RBAC verificado no guard, não no service.

**Perfis e permissões básicas:**
| Perfil | Escopo |
|--------|--------|
| ADMIN | Acesso total ao tenant |
| GERENTE | Gestão operacional, sem configurações críticas |
| BARBEIRO | Próprios atendimentos |
| CLIENTE | Próprio perfil, plano e histórico |

---

## Artigo VII: Observabilidade desde o Início

**Princípio:** O sistema deve ser observável desde o primeiro deploy.

**Implicações:**
- Pino como logger estruturado em JSON em produção.
- Correlation ID em cada requisição (propagado por headers).
- Sentry para captura de exceções não tratadas.
- OpenTelemetry para traces distribuídos.
- Health check endpoint (`/health`) obrigatório.
- Swagger em `/docs` (restrito em produção por API key).

---

## Artigo VIII: Banco de Dados é Responsabilidade da API

**Princípio:** Migrations, schema e integridade são gerenciados pela API via Prisma.

**Tabelas canônicas:**
```
tenants, users, customers, conversations, messages,
appointments, plans, subscriptions, payments,
barbers, reviews, notifications
```

**Implicações:**
- Nunca rodar `prisma db push` em produção, apenas `prisma migrate deploy`.
- Soft delete preferido em vez de hard delete para clientes, atendimentos e assinaturas.
- Indexes obrigatórios em: `tenant_id`, `customer_id`, colunas de busca textual.
- UUID v4 como PK padrão (não auto-increment).

---

## Artigo IX: Desenvolvimento Iterativo por Features

**Princípio:** O sistema é construído feature por feature, com cada feature completamente especificada antes da implementação.

**Ordem de desenvolvimento:**
1. `001-core-foundation`, Setup do projeto, Prisma, Docker, health check
2. `002-auth-rbac`, JWT, refresh token, RBAC, guards
3. `003-customer-crm`, CRUD clientes + CRM automático
4. `004-conversations-messaging`, Conversas e mensagens omnichannel
5. `005-appointments-attendance`, Atendimentos walk-in e controle de status
6. `006-plans-subscriptions`, Planos e assinaturas
7. `007-payments-integration`, Gateway de pagamento
8. `008-event-system-queues`, BullMQ + eventos pós-atendimento
9. `009-dashboard-backoffice`, Métricas e painel
10. `010-whatsapp-instagram-channels`, Webhooks e integração IA

**Verificação:** Nenhuma feature deve ser iniciada sem spec.md e plan.md aprovados.

---

## Artigo X: Modelo de Atendimento: Ordem de Chegada

**Princípio:** A Barbearia Modelo opera por ordem de chegada (walk-in), não por agendamento prévio.

**Implicações:**
- Não existe módulo de "agenda" com slots de horário.
- Atendimentos são registrados quando o cliente chega ou quando o barbeiro inicia o serviço.
- A fila de espera é implícita: atendimentos com status `AGUARDANDO` ordenados por `created_at`.
- O sistema registra o atendimento para métricas e histórico, não para reservar horário.
- O bot não agenda, ele informa, captura dados e direciona.

**Verificação:** Qualquer spec que proponha lógica de agendamento (slots, calendário, disponibilidade) viola este artigo.

---

*Última atualização: versão 2.0*
*Autor: Projeto Barber API*
