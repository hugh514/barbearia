# App do cliente

App em Next.js 16 para o cliente da barbearia: cadastro, login, QR Code de check-in, planos, histórico de atendimentos e perfil.

Funciona como o painel: o navegador fala só com `/api/*` do próprio Next, e a sessão fica em cookie httpOnly. `API_BASE_URL` aponta para a API (padrão `http://localhost:3000`).

Para rodar fora do Docker, com a API no ar:

```bash
npm install
npm run dev     # http://localhost:3002
```

Login de teste: `cliente@barbearia.example` com senha `Cliente123`.

Variáveis do servidor (nunca `NEXT_PUBLIC_`):

| Variável | Padrão | Uso |
|---|---|---|
| `API_BASE_URL` | `http://localhost:3000` | API, só do servidor |
| `DEFAULT_TENANT_SLUG` | `barbearia-modelo` | Barbearia do cadastro quando o link não traz `?b=slug` |
| `COOKIE_SECURE` | segue `NODE_ENV` | `false` só em http local |
| `FORWARD_CLIENT_IP` | `false` | `true` repassa o IP de quem chamou à API em `X-Forwarded-For`, para o limite de tentativas valer por pessoa. Só ligue com um proxy na frente que sobrescreva o `X-Forwarded-For` e com `TRUST_PROXY` na API: o Next mantém o cabeçalho que o navegador manda, e sem proxy qualquer um forja um IP novo a cada tentativa. Desligado, a API vê todos os clientes como o IP do servidor do Next. |

A barbearia vem pelo link: `/cadastro?b=slug` e `/login?b=slug`. Login, cadastro e senha esquecida mantêm o `?b=` nos links entre si. O `?from=` do login só aceita caminho interno. O link do e-mail de senha esquecida é `/reset-password?token=...&tenant=slug`.

Pagamento do plano: ao assinar, o app cria a cobrança PIX (`POST /payments`), mostra QR e copia e cola e consulta o status a cada 3 s até a assinatura ficar ativa. Com o provedor fictício da API (`gatewayData.mock`), aparece o botão "Simular pagamento (dev)". A API não lista cobranças para o cliente, então o app guarda no aparelho (localStorage `bc_pix`) qual cobrança pertence à assinatura pendente, para retomar; em outro aparelho, a API responde 409 e o cliente cancela e assina de novo.

```bash
npm run typecheck
npm run lint
npm test
```

E2E (Playwright, sempre com o navegador visível) contra uma API de dev com `PAYMENTS_PROVIDER` mock e `TRUST_PROXY=true`, e o Redis dela acessível por `docker exec` (o teste de senha esquecida lê o token que a API gravou):

```bash
npm run build
E2E_API_URL=http://127.0.0.1:3030 E2E_REDIS_CONTAINER=barb-cli-redis-1 npm run test:e2e
PRINTS=1 npx playwright test e2e/prints.spec.ts   # regrava docs/prints/cliente
```

O Playwright sobe `next start` em `E2E_BASE_URL` (padrão `http://127.0.0.1:3033`) se não houver servidor ali.
