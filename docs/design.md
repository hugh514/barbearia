# Design: Vez

O produto se chama **Vez**. O negócio é a fila por ordem de chegada, e a pergunta que todo mundo faz numa barbearia é "quem é a vez?". Painel e app do cliente compartilham estes tokens. O nome da barbearia (tenant) aparece em destaque. "Vez" é a marca do sistema e fica discreta.

## Ideia central

A peça memorável é a **senha da fila**: o número da vez em tipografia condensada e grande, como o papel de senha de balcão. No cliente ela é o topo da home ("Você é o 3º"). No painel ela abre cada cartão da fila. Todo o resto fica quieto: fundo claro, bordas finas, quase nenhuma sombra.

## Cor

Base neutra fria, sem tom de marca, no padrão de SaaS sério de gestão. A única cor de marca é a da barbearia, escolhida por ela. Toda cor mora nos tokens de `globals.css` de cada front; componente nenhum usa hex ou cor fixa do Tailwind.

### Base

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--page` | `#F5F6F7` | `#121417` | fundo da página |
| `--surface` | `#FFFFFF` | `#1B1E22` | painéis, formulários, barra lateral |
| `--ink` | `#15181C` | `#E8EBEE` | texto principal, títulos |
| `--muted` | `#5B6470` | `#9AA3AE` | texto secundário (AA sobre page e surface) |
| `--line` | `#DDE1E6` | `#2C3137` | bordas e divisores |

### Marca da barbearia

`--brand` é configurável por barbearia (Configurações, Aparência, só ADMIN). Padrão Cobalto `#1F4FB8`. Presets: Cobalto `#1F4FB8`, Grafite `#2B3036`, Bordô `#6E1F2A`, Verde-garrafa `#1F5A43`, Petróleo `#0A6A82`, Ameixa `#4B2A5E`. Também aceita hex livre; hex inválido cai no padrão.

Derivados calculados em `lib/theme.ts` (função pura, com teste):

- `--brand-fg`: branco ou ink, o que der mais contraste sobre a marca.
- `--brand-soft`: marca misturada à surface (`color-mix`), para item ativo e seleção.
- `--brand-text`: marca ajustada até 4.5:1 sobre a surface do modo atual (escurece no claro, clareia no escuro). Usada em texto e link na cor da marca.

A marca aparece em uma ação por tela, não em todo botão: a ação secundária é contornada ou só texto.

### Semânticas fixas

Iguais para todas as barbearias.

| Token | Claro | Escuro |
|---|---|---|
| `--success` | `#1C7A4E` | `#5CC795` |
| `--warning` | `#8A6414` (fundo `#F4ECD8`) | `#E3B65C` (fundo `#33291A`) |
| `--danger` | `#B3261E` | `#F28B80` |

Na fila: esperando é neutro, na cadeira usa a marca, feitos em muted, cancelado em danger.

### Modo

Claro ou escuro é escolha da barbearia (padrão claro), não do sistema operacional. O layout raiz de cada front lê o tema da barbearia do usuário logado no servidor (`getTenantTheme()`, que chama `GET /channels/config/appearance`; se o token expirou ou a API falhou, usa o cookie de tema gravado no login e ao salvar a aparência: `bb_theme` no painel, `vez_theme` no cliente) e põe as variáveis no `style` do `<html>` junto com `data-theme`. Sem sessão (tela de login, cadastro) o layout não chama a API: vale o cookie de tema, se o navegador ainda tiver um, senão o padrão Cobalto claro. O logout apaga o cookie; no painel, o login sem aparência na API também.

## Marca

- Símbolo: um V de duas lâminas de tesoura abertas que se cruzam num pino perto da base, dentro de um quadrado de raio 22% na cor da marca, lâminas em `--brand-fg`. Desenho em `components/layout/vez-logo.tsx` e `app/icon.svg`.
- Logotipo: símbolo mais "Vez" em Archivo 700, não condensado.
- Na barra lateral do painel e no header do cliente, o símbolo usa a cor da barbearia e o nome da barbearia vem ao lado. "Vez" fica só no rodapé, discreto.
- Variações estudadas em `docs/prints/visual-vez/marca/` e comparadas em `docs/prints/visual-vez/marca.png`. A escolhida é a A.

## Tipografia

Uma família só: **Archivo** (Google Fonts, variável, eixo de largura `wdth` 62 a 125), via `next/font/google` com `axes: ['wdth']`.

- Senha e números grandes: Archivo condensado (`font-stretch: 62%`), peso 800, `tabular-nums`.
- Títulos de página: Archivo `wdth` 100, peso 700, 24px no painel, 28px no cliente.
- Corpo: Archivo 15px no painel, 16px no cliente (evita zoom automático do iOS nos inputs).
- Rótulos de campo: 13px, peso 600, caixa normal. Sem caixa alta espaçada em lugar nenhum.
- Valores em dinheiro e tempos: `tabular-nums`, alinhados à direita em tabela.

## Forma e espaço

- Raio: 6px em controles (botão, input, badge), 10px em painéis, nada de pílula exceto o indicador de status pequeno.
- Elevação: borda `--line` e sem sombra. Sombra só em diálogo e menu flutuante.
- Grade de 4px. Painel com conteúdo em largura total até 1280px. Cliente em coluna única de até 480px, centralizada no desktop, com a senha ocupando a largura.
- Alvo de toque mínimo de 44px no cliente e nos botões da fila do painel.

## Layout

Painel:

```
+---------+-------------------------------------------+
| Barbea- |  Fila de hoje            [+ Cliente chegou]|
| ria     |                                           |
| Modelo  |  Esperando (4)   Na cadeira (3)  Feitos   |
|         |  +-----------+   +-----------+            |
| Fila    |  | 07 Joao   |   | 03 Pedro  |            |
| Check-in|  | 12 min    |   | Rafael    |            |
| Clientes|  | [Chamar]  |   | [Finalizar]            |
| ...     |  +-----------+   +-----------+            |
+---------+-------------------------------------------+
```

- Navegação lateral em surface, não preta. No celular vira barra superior com botão de menu que abre a mesma lista em gaveta.
- Tabelas de verdade (cabeçalho, linhas, `tabular-nums`) em clientes, pagamentos e assinaturas, não pilha de cartões.
- Dashboard: um número principal (atendimentos de hoje) grande, os demais em linha menor, gráfico simples de barras por dia. Nada de quatro cartões iguais com ícone no canto.

Cliente:

```
+----------------------------+
| Barbearia Modelo     [eu]  |
|                            |
|  Você é o                  |
|  3º                        |  <- senha, condensada, enorme
|  2 pessoas na sua frente   |
|                            |
|  [ Mostrar QR de entrada ] |
|                            |
|  Plano Mensal   ativo      |
|  renova em 12 dez          |
+----------------------------+
| Início  Planos  Histórico  |
+----------------------------+
```

## Movimento

Só em resposta a ação: abrir diálogo, confirmar check-in (a senha aparece com uma transição curta), card que muda de coluna. Nada de entrada animada em seção. `prefers-reduced-motion` desliga tudo.

## Texto

- Verbo claro e objeto: "Chamar cliente", "Finalizar atendimento", "Assinar plano Mensal". A mesma ação mantém o nome no toast ("Atendimento finalizado").
- Erro diz o que houve e o que fazer, sem pedir desculpa.
- Vazio convida à ação ("Ninguém esperando. Quando alguém chegar, use Cliente chegou.").
- Sem travessão, sem emoji, sem "→" em botão, sem ponto do meio unindo metadados, sem marketing.
- Datas relativas quando perto ("há 12 min", "ontem"), absolutas quando longe.

## Proibido

Cartões idênticos com sombra em grade, gradiente decorativo, ícone em quadradinho no canto, avatar de inicial em todo lugar, badge que repete o que a coluna já diz, rótulo em caixa alta espaçada, Geist, `#0b0b0d`, âmbar, hex ou cor do Tailwind fora de `globals.css`.
