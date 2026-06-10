# Prompt para Claude Code (Terminal)

> Use este prompt ao iniciar o Claude Code no diretório do projeto.
> Execute: `claude` no terminal e cole este prompt.

---

Estou configurando o projeto Barber API. O repositório é `hugh514/api-nestjs`.

Antes de qualquer coisa:
1. Leia o arquivo `PROMPT.md` neste diretório — ele contém o guia completo de setup
2. Leia `.specify/memory/constitution.md` — são os 10 artigos inegociáveis do projeto

**Tarefa desta sessão:** Apenas setup e integração do Spec Kit. NÃO code features.

Execute as Fases 0 a 6 do PROMPT.md na ordem exata. Ao terminar cada fase, me diga o que foi feito e me pergunte se posso prosseguir para a próxima.

Se o Spec Kit já estiver inicializado (pasta `.specify` existe), pule a Fase 1 e vá direto para a Fase 2 (integrar specs).

Ao final, execute a Fase 5 (validação) e me mostre o resultado de cada check.

---

## Para a PRÓXIMA sessão (Feature 001)

Quando eu disser "implementa feature 001", faça:

1. `git checkout -b feat/001-core-foundation`
2. Leia `specs/001-core-foundation/spec.md` → `plan.md` → `tasks.md`
3. Execute cada task na ordem do `tasks.md`
4. Marque [x] ao completar cada task
5. Ao final, rode os checks da Fase 6 do tasks.md
6. Commite com: `feat(001): implement core foundation`
