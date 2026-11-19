# App do cliente

App em Next.js 16 para o cliente da barbearia: cadastro, login, QR Code de check-in, planos, histórico de atendimentos e perfil.

Funciona como o painel: o navegador fala só com `/api/*` do próprio Next, e a sessão fica em cookie httpOnly. `API_BASE_URL` aponta para a API (padrão `http://localhost:3000`).

Para rodar fora do Docker, com a API no ar:

```bash
npm install
npm run dev     # http://localhost:3002
```

Login de teste: `cliente@barbearia.example` com senha `Cliente123`.

```bash
npm run typecheck
npm run lint
```
