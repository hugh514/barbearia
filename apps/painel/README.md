# Painel

Painel da equipe em Next.js 16: dashboard, fila do dia, clientes, planos e assinaturas, financeiro, equipe, caixa de entrada de WhatsApp e Instagram, check-in por QR Code e configurações da barbearia.

O navegador só conversa com as rotas `/api/*` do próprio Next, que repassam para a API com o token guardado em cookie httpOnly. A variável `API_BASE_URL` diz onde a API está (padrão `http://localhost:3000`) e nunca vai para o bundle do navegador.

Para rodar fora do Docker, com a API no ar:

```bash
npm install
npm run dev     # http://localhost:3001
```

Login de teste: `admin@barbearia.example` com senha `admin123`.

## Testes

```bash
npm test            # vitest
npm run test:e2e    # playwright, precisa do painel e da API no ar
npm run typecheck
```

As specs de cada tela estão em `specs/`.
