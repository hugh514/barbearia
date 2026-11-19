#!/usr/bin/env bash
# Teste de fumaça da API contra o docker compose no ar.
# Uso: bash scripts/testar-api.sh   (API em http://127.0.0.1:3000 por padrão)
# Precisa de curl e node. Cria dados novos a cada execução (telefone e e-mail únicos).
# O login aceita 5 tentativas por minuto; o script faz 3, então espere um minuto
# entre duas execuções seguidas.
set -euo pipefail

API="${API_URL:-http://127.0.0.1:3000}"
RUN="$(date +%s)"
FALHAS=0
STATUS_FILE="$(mktemp)"
trap 'rm -f "$STATUS_FILE"' EXIT

# Avalia uma expressão sobre o JSON da entrada padrão: json 'meta.total'
json() {
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log(new Function('o','with(o){return '+process.argv[1]+'}')(o))})" "$1"
}

# req METODO ROTA [TOKEN] [CORPO]: imprime o corpo e grava o status HTTP em
# $STATUS_FILE (arquivo, porque req costuma rodar dentro de $(...)).
req() {
  local out args=(-s -X "$1" -H 'Content-Type: application/json')
  out="$(mktemp)"
  if [[ -n "${3:-}" ]]; then args+=(-H "Authorization: Bearer $3"); fi
  if [[ -n "${4:-}" ]]; then args+=(-d "$4"); fi
  curl "${args[@]}" -o "$out" -w '%{http_code}' "$API$2" > "$STATUS_FILE"
  cat "$out"
  rm -f "$out"
}

confere() { # confere DESCRICAO STATUS_ESPERADO
  local status; status="$(cat "$STATUS_FILE")"
  if [[ "$status" == "$2" ]]; then
    echo "ok    $1 ($status)"
  else
    echo "FALHA $1 (esperado $2, veio $status)"
    FALHAS=$((FALHAS + 1))
  fi
}

mostra() { sed "s/^/      $1: /"; }

login() { req POST /auth/login "" "{\"email\":\"$1\",\"password\":\"$2\"}" | json accessToken; }

req GET /health >/dev/null; confere "GET /health" 200

ADMIN="$(login admin@barbearia.example admin123)"; confere "login do dono da Barbearia Modelo" 200

# Clientes
req GET '/customers?perPage=5' "$ADMIN" | json meta.total | mostra "clientes cadastrados"
confere "GET /customers" 200
CLIENTE="$(req POST /customers "$ADMIN" "{\"name\":\"Cliente Teste $RUN\",\"phone\":\"119${RUN: -8}\"}" | json id)"
confere "POST /customers" 201
req GET "/customers?search=Teste%20$RUN" "$ADMIN" | json 'data[0].name' | mostra "achado na busca"
confere "GET /customers?search=" 200

# Fila do dia
req GET /appointments/queue "$ADMIN" | json "JSON.stringify(data.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{}))" | mostra "fila de hoje"
confere "GET /appointments/queue" 200
ATEND="$(req POST /appointments "$ADMIN" "{\"customerId\":\"$CLIENTE\",\"services\":[\"Corte\"]}" | json id)"
confere "POST /appointments (cliente entra na fila)" 201

# Equipe: um barbeiro novo inicia e finaliza o atendimento
EMAIL="barbeiro.$RUN@barbearia.example"
req POST /users "$ADMIN" "{\"name\":\"Barbeiro $RUN\",\"email\":\"$EMAIL\",\"password\":\"Senha123\",\"role\":\"BARBEIRO\"}" >/dev/null
confere "POST /users (novo barbeiro)" 201
BARB="$(login "$EMAIL" Senha123)"; confere "login do barbeiro novo" 200
req PATCH "/appointments/$ATEND/start" "$BARB" | json status | mostra "status"
confere "PATCH /appointments/:id/start" 200
req PATCH "/appointments/$ATEND/finish" "$BARB" '{"totalPrice":45,"services":["Corte"]}' | json status | mostra "status"
confere "PATCH /appointments/:id/finish" 200

# Serviços: o catálogo fica na configuração da barbearia
req GET /channels/config "$ADMIN" | json "services.map(s=>s.name+' '+s.price).join(', ')" | mostra "serviços"
confere "GET /channels/config" 200
SERVICOS="$(req GET /channels/config "$ADMIN" | json "JSON.stringify(services.filter(s=>!s.name.startsWith('Teste')).concat([{name:'Teste $RUN',price:'R\$ 10,00'}]))")"
req PATCH /channels/config "$ADMIN" "{\"services\":$SERVICOS}" | json services.length | mostra "serviços agora"
confere "PATCH /channels/config (adiciona serviço)" 200

# Planos e assinatura
req GET /plans "$ADMIN" >/dev/null; confere "GET /plans" 200
PLANO="$(req POST /plans "$ADMIN" "{\"name\":\"Plano Teste $RUN\",\"priceCents\":5000,\"intervalDays\":30,\"benefits\":[\"1 corte\"]}" | json id)"
confere "POST /plans" 201
req POST /subscriptions "$ADMIN" "{\"customerId\":\"$CLIENTE\",\"planId\":\"$PLANO\"}" | json status | mostra "assinatura"
confere "POST /subscriptions" 201

req GET '/dashboard/summary?period=today' "$ADMIN" | json "JSON.stringify(o)" | cut -c1-160 | mostra "resumo de hoje"
confere "GET /dashboard/summary" 200

# Papéis e isolamento entre barbearias
req POST /plans "$BARB" '{"name":"Plano proibido","priceCents":100}' >/dev/null
confere "barbeiro não cria plano" 403
CENTRO="$(login dono@centro.example admin123)"; confere "login do dono da Barbearia do Centro" 200
req GET "/appointments/$ATEND" "$CENTRO" >/dev/null
confere "outra barbearia não vê o atendimento da Modelo" 404
req GET '/customers?perPage=1' "$CENTRO" | json meta.total | mostra "clientes do Centro"
confere "GET /customers como Centro" 200

echo
if [[ $FALHAS -eq 0 ]]; then echo "Tudo certo."; else echo "$FALHAS falha(s)."; exit 1; fi
