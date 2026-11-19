# Agentes: barbearia (monorepo)

Vale para qualquer agente de código que trabalhe aqui. Este é o único AGENTS.md do repositório.

## O que é

Três apps independentes num só repositório, cada um com o próprio `package.json` e `package-lock.json` (sem workspaces):

| Pasta | App | Porta |
|---|---|---|
| `apps/api` | API NestJS 10, Prisma 5, PostgreSQL 16, Redis 7, BullMQ, Socket.IO | 3000 |
| `apps/painel` | Painel da equipe, Next.js 16, React 19, Vitest, Playwright | 3001 |
| `apps/cliente` | App do cliente, Next.js 16, React 19 | 3002 |

Tudo sobe com `docker compose up --build` na raiz. Para mexer num app, entre na pasta dele e rode os scripts dele.

## Leia antes de implementar

- Constituição da API: `docs/constituicao/api.md` (10 artigos inegociáveis).
- Constituição do painel: `docs/constituicao/painel.md`.
- Specs por feature: `apps/api/specs/NNN-*/` e `apps/painel/specs/NNN-*/` (`spec.md` o que, `plan.md` como, `tasks.md` ordem). Siga a ordem numérica.

## Regras que não se quebram

1. A API é o hub. Painel, cliente, WhatsApp, Instagram e IA só falam com a API, nunca entre si nem com o banco.
2. Multi-tenant desde o dia 1: toda tabela tem `tenant_id`, toda query filtra por ele, e o tenant vem do JWT.
3. Sem agendamento. A barbearia atende por ordem de chegada (walk-in).
4. Efeito colateral (mandar WhatsApp, pedir avaliação, cobrar) vai para fila BullMQ, nunca no handler HTTP.
5. A IA nunca acessa o banco direto, só pela API.
6. UUID v4 como chave primária; soft delete em entidade de negócio; TypeScript strict.
7. Nos fronts, tokens ficam em cookie httpOnly e o navegador só fala com `/api/*` do próprio Next. `API_BASE_URL` é só do servidor, nunca `NEXT_PUBLIC_`.
8. RBAC em duas camadas: `src/proxy.ts` no front e guardas na API (a API é a barreira final).

## Next.js 16

Esta versão tem mudanças que quebram o que você conhece (APIs, convenções, estrutura). Antes de escrever código num front, leia o guia em `node_modules/next/dist/docs/` do app e respeite avisos de depreciação.

## Comandos por app

```bash
# apps/api
npm test            # jest, unitários
npm run test:e2e -- --runInBand --forceExit   # banco migrado e com seed, Redis no ar
npm run lint

# apps/painel
npm test            # vitest
npm run test:e2e    # playwright
npm run typecheck

# apps/cliente
npm run typecheck
npm run lint
```

Teste de fumaça da API inteira, com o compose no ar: `bash scripts/testar-api.sh`.

## Commits e PRs

Português, Conventional Commits, atômicos. Branches `feat|fix|chore|docs|test|ci/<escopo>`. Sem trailer de atribuição a ferramentas (`Co-authored-by` de ferramenta, `Made-with` e parecidos).
