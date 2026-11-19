# Design: Vez

O produto se chama **Vez**. O negócio é a fila por ordem de chegada, e a pergunta que todo mundo faz numa barbearia é "quem é a vez?". Painel e app do cliente compartilham estes tokens. O nome da barbearia (tenant) aparece em destaque. "Vez" é a marca do sistema e fica discreta.

## Ideia central

A peça memorável é a **senha da fila**: o número da vez em tipografia condensada e grande, como o papel de senha de balcão. No cliente ela é o topo da home ("Você é o 3º"). No painel ela abre cada cartão da fila. Todo o resto fica quieto: fundo claro, bordas finas, quase nenhuma sombra.

## Cor

| Token | Hex | Uso |
|---|---|---|
| `--ink` | `#16211C` | texto principal, títulos |
| `--pine` | `#1F4D3A` | cor da marca, ação principal, "em atendimento" |
| `--pine-soft` | `#E3ECE6` | fundo de item ativo, seleção |
| `--paper` | `#F4F5F2` | fundo da página |
| `--surface` | `#FFFFFF` | painéis, formulários |
| `--line` | `#D9DED9` | bordas e divisores |
| `--muted` | `#5D6B63` | texto secundário (contraste AA sobre paper e surface) |
| `--brick` | `#A63D2A` | erro, cancelar, ação destrutiva |
| `--ochre` | `#8A6414` | aviso e pendente (texto); fundo `#F4ECD8` |

A cor de marca é verde-garrafa, como couro de cadeira antiga e frasco de loção. Nada de âmbar, dourado nem listras de poste de barbeiro. O verde aparece em uma ação por tela, não em todo botão: a ação secundária é contornada ou só texto.

Não há tema escuro nesta versão. O bloco `.dark` antigo sai do CSS.

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

- Navegação lateral clara (surface), não preta. No celular vira barra superior com botão de menu que abre a mesma lista em gaveta.
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

Cartões idênticos com sombra em grade, gradiente decorativo, ícone em quadradinho no canto, avatar de inicial em todo lugar, badge que repete o que a coluna já diz, rótulo em caixa alta espaçada, Geist, `#0b0b0d`, âmbar.
