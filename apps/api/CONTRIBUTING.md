# Contribuindo — api-barbearia

## Mensagens de commit

- Escreva commits em **português (pt-BR)**.
- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(escopo): …`, `fix(escopo): …`, `chore(escopo): …`, etc.
- Commits **atômicos**: um propósito por commit.
- Branches: `feat|fix|chore|refactor|docs|test|ci/<escopo-curto-kebab>`.

Exemplos:

```text
feat(fila): cancela atendimentos AGUARDANDO ao fim do dia
fix(pagamentos): reconcilia webhook pelo external_reference
docs(readme): alinha portas e estrutura dos módulos
```

## Atribuição a ferramentas (proibido)

Não inclua trailers ou menções a ferramentas em commits ou PRs, incluindo:

- `Co-authored-by: …` de ferramentas
- `Made-with: …`

## Validação local

```bash
npm run lint
npm test
npm run test:e2e
```
