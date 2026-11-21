# Barbearia

Sistema para barbearia que atende por ordem de chegada. O cliente chega, faz check-in mostrando um QR Code no celular e entra na fila. A equipe acompanha a fila, chama o próximo, finaliza o atendimento e vende planos de assinatura pagos por PIX. As conversas de WhatsApp e Instagram caem numa caixa de entrada só, com IA para responder o básico. Uma única API atende várias barbearias ao mesmo tempo, cada uma isolada da outra.

São três apps neste repositório:

- **API** (`apps/api`): NestJS, Prisma, PostgreSQL, Redis com BullMQ e Socket.IO. Toda a regra de negócio mora aqui.
- **Painel** (`apps/painel`): Next.js para a equipe (dono, gerente, barbeiro). Fila, clientes, planos, financeiro, caixa de entrada e check-in.
- **Cliente** (`apps/cliente`): Next.js para o cliente. Gera o QR Code de check-in, vê planos, histórico e perfil.

## Telas

Painel da equipe, logo depois do login:

![Painel](docs/prints/painel.png)

App do cliente, tela inicial:

![Cliente](docs/prints/cliente.png)

## Como rodar

Precisa só de Docker com o Compose 2.24 ou mais novo.

```bash
git clone <url-deste-repositorio> barbearia && cd barbearia
cp .env.example .env
docker compose up --build
```

Na primeira vez demora alguns minutos para montar as imagens. O compose sobe Postgres e Redis, aplica as migrations, roda o seed com dados de exemplo e só então libera o painel e o cliente.

| O quê | Endereço |
|---|---|
| Painel | http://localhost:3001 |
| Cliente | http://localhost:3002 |
| API | http://localhost:3000 (saúde em `/health`, Swagger em `/docs`) |
| Postgres | localhost:5433, usuário e senha `barber` |

Para parar: `docker compose down`. Para zerar o banco também: `docker compose down -v`.

### Cookie de sessão em http

Em produção os fronts marcam os cookies de sessão como `Secure`, e o navegador só os aceita em https. O compose roda em http, então os serviços `painel` e `cliente` recebem `COOKIE_SECURE=false`. Só o valor `false`, escrito assim, desliga o `Secure`; sem a variável ou com qualquer outro valor, vale o padrão (ligado em produção). Nunca use `COOKIE_SECURE=false` num ambiente com https.

### IP de quem chama, pelo painel

O painel fala com a API pelo próprio servidor, então sem ajuste o limite de tentativas de login da API conta todo mundo como um IP só. Com `FORWARD_CLIENT_IP=true`, o painel repassa à API só o último endereço do `X-Forwarded-For` (ou o `X-Real-IP`), o que o proxy da frente anotou, como o app cliente já faz. Só ligue com um proxy de borda que acrescente o IP real ao cabeçalho, e com `TRUST_PROXY` na API: o Next mantém o cabeçalho que o navegador mandar, e sem a borda qualquer um forja um IP novo a cada tentativa.

## Login de teste

Essas senhas existem só no seed, para ambiente local. Não use em produção.

| Onde | E-mail | Senha |
|---|---|---|
| Painel, dono da Barbearia Modelo | admin@barbearia.example | admin123 |
| Painel, gerente | gerente@barbearia.example | admin123 |
| Painel, barbeiros | barbeiro@, rafael@ ou lucas@barbearia.example | admin123 |
| Painel, dono da Barbearia do Centro | dono@centro.example | admin123 |
| Painel, dono da Navalha Norte | dono@navalha.example | admin123 |
| App do cliente | cliente@barbearia.example | Cliente123 |

O seed roda sozinho no `docker compose up` e cria três barbearias, cada uma isolada da outra. A Barbearia Modelo é a mais completa: dono, gerente, três barbeiros, treze clientes, fila do dia com gente esperando, em atendimento, finalizada e cancelada, quatro planos, assinaturas ativas, pendentes, suspensas e canceladas, pagamentos PIX e cartão de teste e conversas de WhatsApp e Instagram. A Barbearia do Centro e a Navalha Norte têm equipe, clientes, planos, serviços e fila menores. Nomes, telefones e e-mails são inventados.

A fila do dia fica com a data em que o banco foi criado. Para ter a fila de novo no dia de hoje, rode `docker compose down -v` e suba outra vez.

## Integrações externas ficam desligadas

O `.env.example` não tem nenhuma chave real.

- **Mercado Pago**: vem com um token falso de teste. O painel mostra os pagamentos do seed, mas gerar uma cobrança PIX nova só funciona se você colocar um token de sandbox seu (`TEST-...`) em `MERCADO_PAGO_ACCESS_TOKEN`.
- **WhatsApp** (Evolution API): sem `EVOLUTION_API_KEY` a API recusa os webhooks e não envia nada.
- **Instagram**: sem `INSTAGRAM_PAGE_ACCESS_TOKEN` nada é enviado.
- **IA** (OpenAI): sem `OPENAI_API_KEY` fica desligada.

Os segredos de webhook do `.env.example` (Mercado Pago e Instagram) são públicos e servem só para testar localmente. Em qualquer ambiente exposto, troque todos; a API recusa subir em produção com esses valores padrão.

## Testes

Com o compose no ar, `bash scripts/testar-api.sh` faz login, lista e cria clientes, põe alguém na fila, cadastra um barbeiro que inicia e finaliza o atendimento, mexe nos serviços, cria plano e assinatura e confere papéis e isolamento entre barbearias. Os testes de cada app ficam dentro dele; os comandos estão no `AGENTS.md`.

## Estrutura

```text
barbearia/
  apps/
    api/        API NestJS (prisma/, src/, test/, specs/)
    painel/     painel da equipe (src/, e2e/, specs/)
    cliente/    app do cliente (src/)
  docs/
    constituicao/   princípios da API e do painel
    prints/         imagens deste README
  scripts/
    testar-api.sh   teste de fumaça da API
  docker-compose.yml
  .env.example
  AGENTS.md         regras para quem (pessoa ou agente) for mexer no código
```

Cada app tem o próprio `package.json` e `package-lock.json`. Não há workspaces: para trabalhar num app, entre na pasta dele e use `npm install` e os scripts de lá. As specs de cada feature ficaram dentro do app a que pertencem (`apps/api/specs`, `apps/painel/specs`).

## Decisões principais

- **Ordem de chegada, sem agendamento.** A barbearia funciona por walk-in. Não existe agenda com horários: a fila é a lista de atendimentos `AGUARDANDO` em ordem de criação, e o bot informa e direciona, mas não marca horário.
- **Várias barbearias numa API (multi-tenant).** Toda tabela tem `tenant_id`, toda consulta filtra por ele e o tenant vem do token JWT. Vazar dado de uma barbearia para outra é tratado como falha de segurança.
- **A API é o centro.** Painel, cliente, WhatsApp, Instagram e IA só falam com a API. Ninguém acessa o banco além dela, nem a IA.
- **Efeito colateral vai para fila.** Mandar mensagem pós-atendimento, pedir avaliação ou oferecer plano roda em jobs do BullMQ, com retry, e nunca trava a requisição.
- **Check-in por QR Code de vida curta.** O cliente gera um token opaco que vale 60 segundos e é guardado no Redis; a equipe lê e o cliente entra na fila. Gerar um novo invalida o anterior.
- **Pagamento pelo gateway.** A API cria a cobrança no Mercado Pago e confirma por webhook com assinatura validada e processamento idempotente. Cartão nunca passa pela API.
- **Sessão em cookie httpOnly nos fronts.** Nas chamadas REST, o navegador fala só com as rotas `/api/*` do próprio Next, que repassam para a API, e os tokens ficam em cookie httpOnly. A exceção é o tempo real do painel: a rota `/api/realtime/token` devolve o access token ao JavaScript e o navegador conecta direto na API (Socket.IO) em `API_PUBLIC_URL`. Por isso essa URL precisa ser alcançável pelo navegador (no compose, `http://127.0.0.1:3000`).
- **Tema por barbearia.** Cada barbearia escolhe uma cor e o modo claro ou escuro (Configurações, Aparência). O layout de cada front lê `GET /channels/config/appearance` e guarda a última aparência num cookie `vez_theme` (só cor, modo e nome), usado quando o token expira ou a API não responde.

Os detalhes estão em `docs/constituicao/` e nas specs de cada app.
