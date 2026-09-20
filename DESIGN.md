# Componentes de UI

Guia dos padrões visuais em uso no app. `src/index.css` define os tokens (cores), `src/App.css` define todo o resto — não há CSS-in-JS nem módulos por componente.

Antes de estilizar algo novo, procure aqui um padrão equivalente. Duplicar uma regra já existente (ex: recriar um botão em pílula do zero) é o tipo de inconsistência que este arquivo existe pra evitar.

## Tokens (`src/index.css`)

Custom properties em `:root`, redefinidas em `@media (prefers-color-scheme: dark)` — claro/escuro automático, sem toggle manual:

`--text`, `--text-h` (títulos), `--text-muted`, `--bg`, `--surface`, `--border`, `--accent` / `--accent-bg`, `--positive` / `--positive-bg`, `--negative` / `--negative-bg`, `--transfer` / `--transfer-bg`, `--subtotal-bg`, `--group-bg` / `--group-text`.

Nunca usar cor hardcoded num componente novo — sempre uma dessas variáveis.

## Layout (`App.tsx` + topo do `App.css`)

- `.app__topbar` — barra fixa no topo (sticky), só com o botão `.menu-toggle` (☰/✕) e o título. É o único elemento sempre visível fora do conteúdo da página.
- `.tabs` — menu lateral. **Oculto por padrão** (`transform: translateX(-100%)`), sobreposto ao conteúdo quando aberto (`.is-open`), com `.sidebar-backdrop` fechando ao clicar fora ou Esc. Mesmo comportamento em desktop e mobile — não é "sidebar fixa que vira drawer no mobile", é sempre drawer.
  - `.tabs__nav` — links de navegação entre páginas.
  - `.tabs__backup` — status + ações de backup (pasta local e Google Drive), via `<BackupStatusBar />`. Fica dentro do menu, não duplicado em outro lugar.
- `.app__main` / `.app__content` — conteúdo da página ativa.

Pra adicionar uma ação global nova (não específica de uma página), o lugar é dentro de `.tabs`, não criar uma segunda barra.

## Botões de ação (`.btn`)

Usar sempre esta família para botões que disparam uma ação (submeter, cancelar, conectar, excluir):

- `.btn` — base.
- `.btn--primary` — ação principal (submeter, conectar).
- `.btn--ghost` — ação secundária (cancelar, desconectar).
- `.btn--small` — variante compacta (dentro de linhas de tabela/modal).

Não criar `<button>` com estilo ad-hoc para esse caso — todo botão de ação do app já usa `.btn` (conferido em toda a árvore de `src/components`).

## Seletor em pílula (filtro/toggle exclusivo)

Grupo de opções lado a lado, formato pílula (`border-radius: 999px`), estado ativo em `--accent`:

- `.status-tabs` — grupo de `<button>`. Usado em: filtro Categorizado/Não categorizado (Extrato), Orçamento/Metas (Categorias), Mensal/Anual (Orçamento e Metas). **Reaproveitar esta classe para qualquer novo alternador de 2+ opções excludentes** — não criar uma classe nova (ex: existia um `.view-mode-toggle` idêntico que foi removido e substituído por `.status-tabs`).
- `.month-selector` — mesmo visual, específico do componente `<MonthSelector>` (12 opções).
- `.account-filter`, `.year-selector` — mesmo visual aplicado a um `<select>` nativo em vez de grupo de botões (uma opção visível por vez). As duas compartilham a mesma regra CSS.

## Controle segmentado (toggle binário dentro de formulário)

`.transaction-form__sign` — dois botões colados (sem gap, borda única), usado em Entrada/Saída (`TransactionForm`) e Recorrente/Mês específico + Entrada/Saída (`PrevisoesPage`). Diferente do seletor em pílula: é para exatamente 2 opções coladas dentro de uma linha de formulário, não para uma lista de filtros.

## Botão-ícone quadrado

26–28px, quadrado, `border-radius: 6px`, borda + fundo `--surface`: `.transaction__delete`, `.category-group__actions button` (28px), `.category-item__actions button` (26px). Cor `--text-muted` por padrão, `--negative` quando a ação é destrutiva (excluir). As três regras estão comentadas no CSS apontando umas pras outras — mesma base, sem selector agrupado porque vivem em seções distantes do arquivo (Extrato vs. Categorias).

## Badges

`.badge` + modificador por tipo: `.badge--entrada`, `.badge--saida`, `.badge--meta`, `.badge--transferencia`, `.badge--split`, `.badge--uncategorized`. Usar para marcar categoria/status de uma transação ou ocorrência — nunca cor de texto solta pra esse fim.

## Listas de valores mensais/anuais

- `.monthly-list` — tabela de categorias × 1 mês selecionado, colunas opcionais Real/Previsto (`showForecast`) e Objetivo/Falta (`showGoals`). Usado em Orçamento e Metas (visão "Mensal").
- `.annual-table` — mesma fonte de dados (`SummarySection`), só que 12 colunas (uma por mês) com o valor **previsto** de cada linha. Usado em Orçamento e Metas (visão "Anual"), tanto pra "Por categoria" quanto "Por conta". Tabela real (`<table>`) com primeira coluna `sticky` e wrapper `overflow-x: auto` — é a peça que sustenta a rolagem horizontal em telas estreitas.

Ambas leem `SummaryRow.values` / `.previstoValues`, que já vêm calculados por `buildCategorySections`/`buildAccountSections` (`src/utils/summary.ts`) — o componente de UI nunca soma valor, só formata.

## Formulários

`.transaction-form` (+ `.transaction-form__row`, `.transaction-form__actions`) é o formulário padrão de "criar registro" — reaproveitado por `TransactionForm` e pelo formulário de nova previsão em `PrevisoesPage`. `.split-editor` é o sub-formulário de rateio por categoria dentro de uma transação expandida.

## Modal

`.modal-backdrop` → `.modal` → `.modal__header` / `.modal__body` / `.modal__footer`, lista de itens em `.modal-entries` / `.modal-entry`. Único consumidor hoje: `CategoryTransactionsModal`. Fechar com `.modal__close`.

## Responsividade

Breakpoint único, `@media (max-width: 640px)`, no final de `App.css`. Ideia geral: colunas de formulário (`.transaction-form__row`) e linhas de valores (`.monthly-list__row`) empilham em vez de espremer horizontalmente; `.annual-table` já rola horizontalmente em qualquer largura (não precisa de regra extra). Não testado em aparelho real — só revisado por CSS/breakpoint.
