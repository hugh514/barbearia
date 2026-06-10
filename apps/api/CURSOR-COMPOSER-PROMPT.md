# Prompt para Cursor Composer 2.5

> Cole este texto inteiro na caixa do Composer no Cursor IDE.
> Mode: Agent (não Fast)
> Model: claude-sonnet-4-20250514 ou claude-opus-4-20250514

---

## Instrução

Você está configurando o projeto **Barber API** — uma API NestJS que será o hub central de uma plataforma de barbearia. O projeto usa **Spec-Driven Development** via GitHub Spec Kit.

**NESTA SESSÃO, você NÃO vai codar features.** Você vai apenas:

1. Inicializar o repositório no GitHub `hugh514/api-barbearia`
2. Integrar o Spec Kit
3. Copiar as 10 feature specs (spec.md + plan.md + tasks.md) para a estrutura correta
4. Criar os arquivos base (CLAUDE.md, .gitignore, .editorconfig, .nvmrc)
5. Validar que tudo está no lugar
6. Fazer o commit inicial

### Passo 1 — Clonar e Setup Inicial

```bash
git clone https://github.com/hugh514/api-barbearia.git barber-api
cd barber-api
git checkout -b setup/spec-kit-integration
```

### Passo 2 — Instalar Spec Kit

```bash
# Opção A: Se tem pipx
pipx install git+https://github.com/github/spec-kit.git
specify init . --integration claude

# Opção B: Se tem uvx/uv
uvx --from git+https://github.com/github/spec-kit.git specify init . --integration claude

# Opção C: Manual (se nenhum acima funcionar)
mkdir -p .specify/memory .claude/commands specs
```

### Passo 3 — Extrair o ZIP de Specs

Extraia o arquivo `barber-api-specs.zip` (que está neste mesmo pacote) para dentro do repositório:

```bash
# Copiar constitution
cp barber-specs/.specify/memory/constitution.md .specify/memory/constitution.md

# Copiar todas as specs
cp -r barber-specs/specs/* specs/
```

### Passo 4 — Criar Arquivos de Configuração

Crie os arquivos listados no `PROMPT.md` (seção "Fase 3"):

- `.gitignore`
- `.nvmrc` (conteúdo: `20`)
- `.editorconfig`
- `CLAUDE.md` (use o arquivo fornecido neste pacote)

### Passo 5 — Validar

```bash
# Deve retornar 10 diretórios
ls specs/0*/

# Cada diretório deve ter 3 arquivos
for d in specs/0*/; do echo "$d: $(ls $d | wc -l) files"; done

# Constitution deve existir
cat .specify/memory/constitution.md | head -3
```

### Passo 6 — Commit

```bash
git add -A
git commit -m "chore: integrate spec-kit with 10 barber-api feature specs

Spec Kit initialized with Claude Code integration.
Constitution v2.0 (10 articles including walk-in model).
Features 001-010 with spec.md + plan.md + tasks.md each.
CLAUDE.md context file for AI-assisted development."

git push origin setup/spec-kit-integration
```

### ⚠️ O que NÃO fazer

- NÃO rode `nest new` — isso é Task T001-01 da Feature 001
- NÃO instale dependências npm
- NÃO crie Docker Compose
- NÃO crie schema Prisma
- NÃO comece nenhuma feature

---

## Depois desta sessão

Na próxima sessão do Composer, use:

```
Leia specs/001-core-foundation/spec.md, plan.md e tasks.md.
Implemente TODAS as tasks da Fase 1 ao Fase 6, na ordem.
Marque cada task com [x] no tasks.md ao completar.
Siga RIGOROSAMENTE o plan.md para schema Prisma, Docker e estrutura de diretórios.
Consulte .specify/memory/constitution.md para validar cada decisão.
```
