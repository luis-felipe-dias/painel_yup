# Painel Yup — rodada 2: vidro em tudo + camada mobile

**Data:** 17/10/2026 · **20 arquivos gravados.** Todos passam no parser. **Zero `#rrggbb`** em todo o `src`.

---

## 1. Camada mobile — o que vale para o painel inteiro

Não precisa repetir nada disso tela por tela. São regras globais.

### `index.html`

| O quê | Por quê |
|---|---|
| `viewport-fit=cover` | sem ele `env(safe-area-inset-*)` devolve **sempre 0**, e o rodapé da conversa fica atrás da barra de gestos do iPhone |
| `theme-color` claro/escuro | a barra do navegador acompanha o tema do painel |
| `apple-mobile-web-app-*` | salvo na tela inicial, abre sem barra de navegador — vira quase app |
| `format-detection: telephone=no` | o iOS parava de pintar número de pedido como link de telefone |

**Não** coloquei `maximum-scale=1`. É o truque mais comum para "resolver" o zoom do iOS, e ele quebra a acessibilidade de quem precisa aumentar o texto. O jeito certo é o campo ter 16px — que é o que fiz.

### `index.css`

- **`overflow-x: hidden` no `html, body`** — a *página* nunca rola de lado. Tabela larga rola dentro do próprio container.
- **`overscroll-behavior-y: none`** — acabou o "puxa pra atualizar" acidental no meio da conversa.
- **`#root { height: 100dvh }`** — `100vh` no celular inclui a barra de endereço, que some ao rolar; o rodapé ficava escondido atrás dela.
- **`-webkit-text-size-adjust: 100%`** — iPhone deitado parava de aumentar a fonte sozinho.
- **`.area-segura-baixo/topo/lados`** — respeita notch, ilha dinâmica e barra de gestos. Já aplicado na barra de digitação.
- **`input/textarea/select` com 16px abaixo de `md:`** — é o limite: menos que isso e o Safari dá zoom sozinho ao focar, deixando a tela torta até fechar o teclado. Agora vale para **todo** campo, não só os que alguém lembrou de marcar.
- **`.folha-celular`** — modal vira folha de baixo para cima no celular. O polegar alcança os botões.
- **`@media (pointer: coarse)`** — alvo mínimo de 44px, e `:active` com opacidade (no toque não existe hover; o estado pressionado é o único retorno).
- **`.faixa-chips`** com scroll-snap — o filtro não para cortado pela metade.

### Componentes base

- **`Button`** — no dedo nasce com 44px e encolhe no desktop. Era o contrário: 32px fixo, impossível de acertar em pé no balcão com o celular numa mão. Ganhou `active:scale` e tamanho novo `icon-sm`.
- **`Input`** — 44px e `text-base` no celular, 36px e `text-sm` no desktop.
- **`Modal`** — folha de baixo no celular, caixa centralizada no desktop, em `glass-solid`. Botão de fechar com 44px.

### Armadilha do Tailwind que teria quebrado tudo em silêncio

Este projeto usa **Tailwind 3.3.6**. Nessa versão `minHeight`/`minWidth` **não herdam** a escala de `spacing` — isso só vale do 3.4 em diante. Então `min-h-toque` sairia do build como classe inexistente e o alvo de toque simplesmente não aconteceria, sem erro nenhum. Declarei `minHeight` e `minWidth` explícitos no config.

---

## 2. Telas — o padrão aplicado

**Estoque, Estoque Mínimo, Compras** eram tabelas de 700px de largura mínima. No celular o lojista arrastava a tabela de lado procurando a coluna. Agora: **tabela no desktop, cartão no celular**. Cada cartão mostra o nome (2 linhas), o código pequeno, e **só os 3 números que decidem** (em estoque / mínimo / a repor), com o selo de status no canto. O resto fica no "ver mais".

**Configurações** tinha 4 abas em `flex-1` — no celular, 4 textos espremidos. Viraram faixa rolável com 44px cada. As grades de permissão eram pílulas de largura irregular, pequenas demais para o dedo: viraram grade de 2 colunas com alvo grande, dentro de `fieldset/legend`.

**Listas** (usuário, atendente, contato, grupo): "avatar + nome + metadados + 2 botões" numa linha só estourava a 360px. Agora empilha — informação em cima, ações embaixo à direita.

**Login** ganhou fundo ambiente próprio, cartão `glass-solid`, e `autoComplete` correto (o gerenciador de senhas do celular passa a funcionar).

**KPIs** saíram de 4 colunas para `grid-cols-2 md:grid-cols-4`. Quatro números lado a lado em 360px é ilegível.

**`tnum` em todo número** — contador, percentual, estoque, preço, tempo. Sem isso o número "dança" a cada atualização porque os dígitos têm larguras diferentes.

---

## 3. Bugs reais encontrados nesta rodada

### Consertado

**Scroll infinito morto no desktop (Estoque).** O `loadMoreRef` estava preso a **dois** `<div>` diferentes — o bloco mobile e o desktop. Como os dois ficam no DOM e só são escondidos por CSS, o React entregava o ref a um só, e no desktop o `IntersectionObserver` observava um elemento `display:none`. O scroll infinito nunca disparava. Virou uma sentinela única.

### Encontrado e **não** consertado (é lógica/permissão, preciso do seu OK)

| Onde | O quê |
|---|---|
| **Estoque Mínimo** | Para quem **não é admin**, os 3 campos de mínimo continuam editáveis mas a coluna "Ações" fica vazia. A pessoa digita, não tem botão para salvar, e perde o que digitou. |
| **Compras** | Mesma coisa: para não-admin a tela é só leitura, mas nada diz isso. |
| **Estoque Mínimo** | `handleValorChange` descarta `NaN` — e campo vazio é `NaN`. **Apagar o conteúdo do input não funciona**, o valor anterior volta. |
| **Compras** | O KPI "Ações Pendentes" é `zerado + abaixoMinimo`, que por construção é igual ao `total` do primeiro cartão. **Os dois cartões sempre mostram o mesmo número.** |
| **Estoque / Est. Mínimo / Compras** | `debouncedBusca` é calculado e **nunca usado** — o filtro roda a cada tecla sobre a lista inteira. É provavelmente parte da lentidão nessas telas. |
| **Estoque** | `isAdmin` calculado e nunca usado — sugere que alguma ação deveria ser restrita e não é. |
| **Configurações** | **Não existe nenhum campo para trocar ou resetar senha** — nem de usuário nem de atendente. Quem esquecer depende de mexer no banco. |
| **Configurações** | A senha de 4 dígitos do atendente **não é validada** (só o código é). Cadastra com 5+ dígitos e a pessoa nunca consegue entrar, porque o servidor exige exatamente 4. |
| **Configurações** | `PAGINAS_DISPONIVEIS` não tem **Contatos nem Grupos** — não há como conceder ou negar essas duas telas. São justamente as que não filtram por setor. |
| **Login** | Senha errada não mostra nada: o formulário só para de carregar. |
| **Métricas** | Cartão "Fila pendente" sempre em tom negativo, mesmo com fila zerada. |
| **Contatos** | Ao trocar de filtro, o texto digitado fica no campo mas é descartado da busca — parece busca ativa e não é. |

### Decisão que preciso que você confirme

**Tirei os emojis dos rótulos de estoque** (`🔴 CRÍTICO`, `⚠️`, `📅 Dia a Dia`), que viraram selo colorido com token. Se os emojis eram intencionais para leitura rápida no balcão, devolvo numa linha.

E no cartão do celular, **"Em estoque" é a soma dos três depósitos** (Controle Geral + Depósito Loja + Casa Velha), porque não existe campo de total. Se preferir os três separados, ajusto.

---

## 4. Antes de publicar

```bash
npm run build
```

Não rodei o build — é onde apareceria um import que eu não enxergo daqui. Dois já sinalizados: `src/services/metricas.service.ts` existe no seu PC mas não veio no snapshot, então não consegui conferir as chamadas do Dashboard e de Métricas contra ele.

Depois: abra no celular e confira **Conversas** e **Estoque** primeiro — são as duas telas onde o padrão novo muda mais.
