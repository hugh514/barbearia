#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║  Barber API — Spec Kit Bootstrap             ║"
echo "║  Barbearia Modelo · Ji-Paraná/RO                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── Variáveis ─────────────────────────────────────
PROJECT_DIR="${1:-barber-api}"
INTEGRATION="${2:-claude}"

# ─── Pré-requisitos ────────────────────────────────
echo "🔍 Verificando pré-requisitos..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js não encontrado. Instale v20+."; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git não encontrado."; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js $NODE_VERSION encontrado. Versão 20+ necessária."
  exit 1
fi

echo "✅ Node.js v$(node -v)"
echo "✅ Git $(git --version | cut -d' ' -f3)"

# ─── Instalar Spec Kit ──────────────────────────────
echo ""
echo "📦 Instalando Spec Kit CLI..."
if command -v pipx >/dev/null 2>&1; then
  pipx install git+https://github.com/github/spec-kit.git 2>/dev/null || echo "Spec Kit já instalado"
elif command -v uvx >/dev/null 2>&1; then
  echo "Usando uvx (instalação temporária)"
else
  echo "⚠️  pipx nem uvx encontrados. Instale com: pip install pipx && pipx install git+https://github.com/github/spec-kit.git"
  echo "   Continuando sem spec-kit CLI (arquivos serão copiados manualmente)..."
fi

# ─── Criar ou navegar para o diretório ────────────
if [ -d "$PROJECT_DIR" ]; then
  echo "📂 Usando diretório existente: $PROJECT_DIR"
  cd "$PROJECT_DIR"
else
  echo "📂 Criando diretório: $PROJECT_DIR"
  mkdir -p "$PROJECT_DIR"
  cd "$PROJECT_DIR"
  git init
fi

# ─── Inicializar Spec Kit ──────────────────────────
echo ""
echo "⚙️  Inicializando Spec Kit com integração: $INTEGRATION"
if command -v specify >/dev/null 2>&1; then
  specify init . --integration "$INTEGRATION" --force 2>/dev/null || true
else
  # Criar estrutura manualmente se CLI não disponível
  mkdir -p .specify/memory
  mkdir -p .claude/commands 2>/dev/null || true
  echo "⚠️  Spec Kit CLI não disponível — estrutura criada manualmente"
fi

# ─── Copiar specs ──────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "📋 Copiando specs do projeto..."

# Copiar constitution
cp "$SCRIPT_DIR/barber-specs/.specify/memory/constitution.md" .specify/memory/constitution.md

# Copiar specs
cp -r "$SCRIPT_DIR/barber-specs/specs" .
cp "$SCRIPT_DIR/barber-specs/README.md" specs/README.md

echo "✅ 10 feature specs copiadas"

# ─── Criar arquivos de configuração ────────────────
echo ""
echo "📝 Criando arquivos de configuração..."

# .gitignore
cat > .gitignore << 'GI'
node_modules/
dist/
.env
*.env.local
.DS_Store
coverage/
*.tsbuildinfo
GI

# .nvmrc
echo "20" > .nvmrc

# .editorconfig
cat > .editorconfig << 'EC'
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
EC

# CLAUDE.md
cp "$SCRIPT_DIR/CLAUDE.md" ./CLAUDE.md 2>/dev/null || true

echo "✅ Arquivos de configuração criados"

# ─── Validação ─────────────────────────────────────
echo ""
echo "🔎 Validando estrutura..."

ERRORS=0

# Check constitution
if [ -f ".specify/memory/constitution.md" ]; then
  echo "  ✅ Constituição presente"
else
  echo "  ❌ Constituição ausente"
  ERRORS=$((ERRORS + 1))
fi

# Check all 10 specs
SPEC_COUNT=$(ls -d specs/0*/ 2>/dev/null | wc -l)
if [ "$SPEC_COUNT" -eq 10 ]; then
  echo "  ✅ 10 specs presentes"
else
  echo "  ❌ Esperava 10 specs, encontrou $SPEC_COUNT"
  ERRORS=$((ERRORS + 1))
fi

# Check each spec has 3 files
for dir in specs/0*/; do
  FILES=$(ls "$dir" 2>/dev/null | wc -l)
  if [ "$FILES" -ne 3 ]; then
    echo "  ❌ $dir tem $FILES arquivos (esperava 3)"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo "  ✅ Todos os arquivos presentes (30 spec files + constitution)"
fi

# ─── Resumo ────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ SETUP COMPLETO!"
else
  echo "⚠️  Setup completo com $ERRORS problemas"
fi
echo ""
echo "Estrutura:"
echo "  .specify/memory/constitution.md  ← 10 artigos inegociáveis"
echo "  specs/001..010/                  ← 10 features (spec+plan+tasks)"
echo "  CLAUDE.md                        ← Contexto para Claude Code"
echo ""
echo "Próximo passo:"
echo "  1. Abra o projeto no seu editor (Cursor, VS Code, etc)"
echo "  2. Cole o conteúdo de PROMPT.md como instrução para a IA"
echo "  3. OU use: /speckit.implement Feature 001 — Core Foundation"
echo "════════════════════════════════════════════════"
