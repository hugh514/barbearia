# Workflow de Desenvolvimento — Cursor Composer

**Propósito:** Padronizar o ciclo real de implementação, correção e merge de features com o Cursor Composer (mode Agent).

**Público:** Desenvolvedor humano + agente de IA no Composer.

---

## Princípio central

**Uma feature por sessão do Composer.** O contexto do Composer tem limite; duas features na mesma sessão fazem o agente esquecer o que fez no início.

---

## Estratégia de branches

Cada feature nasce da `main` atualizada e segue a ordem numérica:

```
main
 └── feat/001-core-foundation      ← Composer implementa → PR → merge
      └── feat/002-auth-rbac       ← Composer implementa → PR → merge
           └── feat/003-customer-crm
                └── ...
```

**Regra:** Não pule features. A ordem é `001 → 002 → … → 010`.

---

## Ciclo por feature

| # | Etapa | Quem | Onde |
|---|-------|------|------|
| 1 | Criar branch | Humano | `git checkout main && git pull && git checkout -b feat/NNN-nome` |
| 2 | Sessão Composer — implementação | Agente | Prompt de implementação (abaixo) |
| 3 | Sessão Composer — validação | Agente | **Cria testes + roda smoke** (abaixo) — mesma sessão se couber no contexto |
| 4 | Testar manualmente | Humano | Itens `manual` de `validation.md` |
| 5 | Sessão Composer — fix (se necessário) | Agente | Mesma branch, prompt de correção pontual |
| 6 | Commit + push | Humano | Conventional Commits em inglês |
| 7 | Merge na main | Humano | PR → review → merge |
| 8 | Próxima feature | Humano | `git checkout main && git pull` → nova branch |

### Sessão 1 — Implementação

Prompt sugerido:

```
Leia antes de começar:
- .specify/memory/constitution.md
- specs/NNN-nome/spec.md
- specs/NNN-nome/plan.md
- specs/NNN-nome/tasks.md

Implemente a Feature NNN seguindo specs/NNN-nome/tasks.md na ordem.
Marque cada task com [x] ao completar.

NÃO encerre ainda — ao terminar as tasks, execute a Sessão de Validação abaixo na mesma sessão.
```

### Sessão de validação — criar testes e rodar smoke (recomendado)

**Esta é a etapa que fecha o ciclo.** Peça ao Composer para **gerar** os artefatos de teste e **executá-los**, não só rodar scripts prontos.

Prompt (cole ao fim da implementação ou em sessão dedicada na mesma branch):

```
Leia specs/NNN-nome/validation.md (crie o arquivo se não existir, derivando os casos de spec.md).

1. Crie ou atualize scripts/smoke-NNN.sh cobrindo todos os itens marcados como "smoke" ou "Auto".
2. Crie ou atualize testes e2e em test/feature-NNN.e2e-spec.ts para os endpoints críticos da feature.
3. Adicione em package.json: "smoke:NNN": "./scripts/smoke-NNN.sh" (se ainda não existir).
4. Execute nesta ordem e reporte pass/fail de cada passo:
   - npm run build
   - npm run lint
   - npm run smoke:NNN   (ou ./scripts/smoke-NNN.sh)
   - npm run test:e2e -- --testPathPattern=feature-NNN
5. Se algo falhar, corrija o código (não enfraqueça o teste) e rode de novo até passar.
6. Liste os itens "manual" de validation.md que o humano ainda precisa verificar.
```

**Por que pedir para criar + rodar:** o agente materializa o contrato de aceite em código executável; você só revisa o diff dos testes e confere os casos manuais (parar postgres, Sentry, etc.).

### Sessão 2 — Fix (mesma branch)

Quando testes manuais falharem, abra **nova sessão** do Composer na mesma branch:

```
Na branch feat/NNN-nome, corrija o seguinte problema:

[descreva o erro exato ou cole o stack trace]

Arquivo suspeito: src/caminho/arquivo.ts (linha ~X)

Mantenha o padrão de specs/NNN-nome/plan.md. Não refatore fora do escopo.
```

Para fixes pequenos (1–3 linhas), prefira **Cmd+K inline** no arquivo — consome muito menos tokens que o Composer.

---

## Leitura obrigatória antes de implementar

Para **toda** feature, o agente deve ler nesta ordem:

1. `.specify/memory/constitution.md`
2. `specs/NNN-nome/spec.md`
3. `specs/NNN-nome/plan.md`
4. `specs/NNN-nome/tasks.md`
5. `specs/NNN-nome/validation.md` (criar na validação se não existir)

Inclua a lista de arquivos no **início** do prompt do Composer — isso força leitura do contexto em vez de inventar.

---

## Artefatos de validação (o agente cria)

| Artefato | Caminho | Responsável |
|----------|---------|-------------|
| Checklist de aceite | `specs/NNN-nome/validation.md` | Agente (a partir de `spec.md`) |
| Smoke script | `scripts/smoke-NNN.sh` | Agente (itens Auto/smoke) |
| E2E Jest | `test/feature-NNN.e2e-spec.ts` | Agente (endpoints HTTP críticos) |
| npm script | `"smoke:NNN": "./scripts/smoke-NNN.sh"` | Agente |

Referência para Feature 001: `specs/001-core-foundation/validation.md` + `scripts/smoke-001.sh`.

O humano só executa itens **manual** (parar postgres/redis, hot reload, Sentry dashboard, Basic Auth em prod).

---

## Dicas de economia de tokens

| Situação | Abordagem |
|----------|-----------|
| Implementação de feature inteira | Composer Agent |
| Fix pontual em 1 arquivo | Cmd+K inline |
| Agente errou algo | Indique arquivo + trecho exato; não peça refazer tudo |
| Contexto da feature | "Leia X, Y, Z antes de começar" no prompt |
| Fim da sessão | Peça para **criar** smoke + e2e e **rodar** até passar |

### Estimativa de custo (Composer 2.5 Agent)

| Tipo | Tokens aproximados |
|------|-------------------|
| Feature simples (ex.: 001) | 50k–100k |
| Feature grande (ex.: 010) | 200k+ |
| Fix por sessão | 10k–30k |

---

## Commits e PR

- Mensagens em **inglês**, [Conventional Commits](https://www.conventionalcommits.org/)
- Um commit lógico por mudança
- Sem trailers de atribuição a IA em commits **e** PRs (`Co-Authored-By: Cursor`, etc.) — ver `CONTRIBUTING.md`
- Hooks locais: `git config core.hooksPath .githooks`

---

## Mapa de validação por feature

| Feature | Branch | Validation spec | Smoke | E2E |
|---------|--------|-----------------|-------|-----|
| 001 | `feat/001-core-foundation` | `validation.md` | `smoke-001.sh` | `test/feature-001.e2e-spec.ts` |
| 002+ | `feat/NNN-…` | agente cria | agente cria | agente cria |

Comando único após implementação: `npm run smoke:NNN && npm run test:e2e -- --testPathPattern=feature-NNN`
