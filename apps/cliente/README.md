# barbearia-cliente

App do cliente da plataforma de barbearia. Consome exclusivamente a API
[`api-barbearia`](https://github.com/hugh514/api-barbearia).

| Item | Valor |
|------|--------|
| Repositório | https://github.com/hugh514/barbearia-cliente |
| Porta local | `http://localhost:3002` |
| API | `API_BASE_URL=http://localhost:3000` |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Zod · react-hook-form

## Arquitetura

- **Auth por cookie httpOnly + proxy**: o browser fala só com `/api/*`; tokens não vão para o JS do cliente.
- **RBAC**: `src/proxy.ts` protege rotas do papel `CLIENTE`.
- **Validação Zod** das respostas da API.

## Estrutura

```text
src/
  app/            # rotas (public: login/cadastro/senha; app: home/planos/…)
    api/          # proxy e auth
  features/       # auth, checkin, plans, payments, queue, history, profile
  components/     # ui + layout
  lib/            # http, auth, format
  config/         # route-access
  proxy.ts        # proteção de rota (Next 16)
```

## Rodar

```bash
cp .env.example .env.local
npm install
npm run dev
```

A API precisa estar no ar (`api-barbearia`).

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Ecossistema

| Repositório | Papel | Porta |
|-------------|--------|-------|
| [api-barbearia](https://github.com/hugh514/api-barbearia) | API | 3000 |
| [barbearia-backoffice](https://github.com/hugh514/barbearia-backoffice) | Painel da equipe | 3001 |
| [barbearia-cliente](https://github.com/hugh514/barbearia-cliente) | App do cliente | 3002 |
