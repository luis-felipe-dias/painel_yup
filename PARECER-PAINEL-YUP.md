# Painel Yup — parecer de revisão

**Data:** 17/10/2026 · **Escopo:** design (Apple Glass), travas de Conversas, modelo de permissões.
**Status:** piloto aplicado em Conversas + menu. As outras 7 telas seguem no visual antigo até aprovação.

---

## 1. As travas — causa raiz de cada uma

Você marcou os quatro sintomas. Eles têm **três** causas, não quatro.

### 1.1 Mensagem duplicada no envio

Duas mensagens provisórias eram criadas para cada envio, e **nenhuma** era removida:

| Onde | O que criava | Removida? |
|---|---|---|
| `useChat.sendMessage` | `temp-1760...` no estado da tela | nunca |
| `chat.service.sendMessage` | `sessaoId-{indice}` dentro do cache | só por acaso |

Quando a mensagem real chegava da API, ela vinha com **outro id** — porque o id é derivado da *posição* na lista (`mensagem.adapter.ts`), e o cliente não tem como adivinhar qual posição o servidor vai gravar. A tela então mostrava a provisória **e** a real.

**Corrigido:** uma provisória só, marcada como pendente, que sai da tela quando a real equivalente chega (casamento por conteúdo + remetente, não por id). Se o envio falhar, sai na hora — nada de bolha de mensagem que o cliente nunca recebeu. Se em 45s o servidor não confirmar, sai também: fantasma permanente é pior que sumir.

### 1.2 Painel lento depois de um tempo aberto

Três somas:

- **Poll caro.** A cada 5 segundos o painel baixava **todas** as mensagens da conversa e recalculava o hash de **cada uma**. Conversa de 300 mensagens = 300 hashes a cada 5 segundos. Durante o expediente inteiro.
  → Agora calcula uma assinatura barata primeiro (quantidade + marca da última). Se não mudou, sai sem tocar em nada. Em ~90% dos ciclos, não mudou.
- **Cache que nunca encolhia.** O atendente abre dezenas de conversas por dia e o cache de todas ficava vivo até o F5.
  → `podar()`: mantém as 8 mais recentes.
- **`DesktopSidebar` e `MobileSidebar` declaradas dentro do componente pai.** Isso cria um *tipo* de componente novo a cada render — o React desmonta e remonta a barra lateral inteira, toda vez.
  → Viraram componentes de módulo.

Mais duas economias que entraram junto: **aba escondida não busca nada** (o atendente está no Olist, não no painel), e **backoff em erro** — servidor fora do ar deixa de levar uma batida a cada 5s e passa a esperar até 1 minuto.

### 1.3 Trava ao abrir uma conversa

O código apagava o cache **imediatamente antes** de tentar usar o cache:

```js
chatService.clearCache(sessaoId);   // apaga
loadInitial();                      // "se tiver cache, usa o cache"
```

Toda abertura baixava a conversa inteira do zero. **Corrigido:** o cache sobrevive, a conversa reabre instantânea e atualiza por trás.

### 1.4 Lista pisca / duplica

Dois caminhos para a mesma atualização: o `chat.service` notificava callbacks registrados **e** o `useChat` aplicava o diff retornado. Dois `setMessages`, dois renders, dois scrolls por ciclo. Pior: `onUpdate` fazia *push* num array e **não existia `offUpdate`** — callback acumulava a cada montagem.

**Corrigido:** o pub/sub foi removido. Um caminho só.

Na lista da esquerda havia outro: uma requisição **por sessão aberta**, a cada 5 segundos, para descobrir quem estava atendendo. 20 sessões = 240 requisições por minuto, por atendente logado. Virou **uma** chamada (`/auth/atendentes/por-sessao`), a cada 15s.

---

## 2. Design — Apple Glass aplicado

### 2.1 O que é o material

Três camadas, do mais sutil ao mais sólido. A tinta é o **fundo do app com opacidade**, nunca branco puro — vidro branco sobre fundo claro vira leite.

| Classe | Opacidade | Desfoque | Onde |
|---|---|---|---|
| `glass-thin` | 55% | 12px | cabeçalho da lista, chips |
| `glass` | 72% | 20px | sidebar, header, barra de digitação |
| `glass-solid` | 86% | 36px | popover, modal, gaveta do celular |

O que faz parecer vidro de verdade não é a transparência — é o **brilho de 1px no topo** (`inset 0 1px 0`). Sem ele é só um card transparente.

**Fundo ambiente:** vidro só existe se houver algo atrás para desfocar. A classe `ambiente` pinta três manchas suaves da paleta Yup (Brincadeira, Folha, Abraço), fixas, sem custo de animação.

### 2.2 Onde o vidro NÃO entrou — de propósito

`backdrop-filter` é caro: o navegador recalcula o desfoque a cada rolagem do que está atrás. Em superfície fixa é barato (são 3 ou 4). **Em item de lista que se repete é um recálculo por item, por quadro** — é exatamente assim que um painel de atendimento começa a travar depois de uma hora aberto.

Então: vidro na sidebar, no header, no cabeçalho da lista e na barra de digitação. **Nenhum** nos cards de conversa.

Dois escapes já embutidos:
- Navegador sem suporte → cai para opaco (`@supports not`). Fica menos bonito, nunca ilegível.
- `prefers-reduced-motion` → desliga animação **e o desfoque**. Em máquina fraca, o vidro é justamente o que engasga.

### 2.3 Medidas padronizadas

| Token | Valor | Uso |
|---|---|---|
| `h-header` | 56px | barra superior e topo da sidebar |
| `h-toque` | 44px | alvo mínimo de toque |
| `rounded-sm/md/lg/xl/2xl` | 8/12/16/22/28px | o raio acompanha o tamanho do elemento |

Grade de 4pt em tudo. Escada de raios ~1,4× por nível, como no sistema da Apple: chip usa `sm`, card usa `lg`, painel usa `2xl`. Um anel de foco só no painel inteiro (`foco-anel`).

**Limpeza de cor:** 135 hexadecimais soltos saíram de `ConversaWindow` e `MensagemItem`. O painel estava com **azul da Apple** (`#007aff`) e roxo (`#5856d6`) como cor de ação — nada a ver com a Yup. Agora é Noite Serena para ação e Brincadeira Viva para acento.

### 2.4 O que tirei da tela

- **Caixa "Pesquisar..." do header** — não pesquisava nada. Campo morto é pior que campo nenhum: o atendente digita, não acontece nada, e passa a desconfiar do painel inteiro. A busca de verdade está dentro de Conversas, onde o dado está.
- **Sininho com bolinha vermelha fixa** — alerta sempre aceso é ruído; em uma semana ninguém olha.
- **Título gigante no header** — repetia o item já marcado na lateral.

**No lugar:** contador de *conversas aguardando*, visível de qualquer tela, que **some quando está tudo em dia**. Indicador que some quando está tudo certo é indicador em que se acredita. Custa zero requisição — lê o cache que a tela de Conversas já preencheu.

### 2.5 Menu reorganizado

Dez itens em lista corrida obrigam a reler todos toda vez. Agora são três blocos por natureza do trabalho:

- **Atendimento** — Conversas, Contatos, Grupos, Respostas rápidas
- **Operação** — Estoque, Estoque mínimo, Compras
- **Gestão** — Visão geral, Métricas, Configurações

O atendente vive no primeiro bloco e nunca precisa passar o olho pelos outros.

Também: o botão **Sair** não tinha `onClick` — nem no desktop, nem no celular. Clicava e não acontecia nada. Agora funciona, com confirmação. E a preferência de menu recolhido sobrevive ao F5.

---

## 3. Permissões — o diagnóstico incômodo

### 3.1 Quem abre o quê, hoje

| Rota | Admin | Atendente c/ permissão | Atendente s/ permissão |
|---|---|---|---|
| `/dashboard` | abre | abre | **abre** |
| `/conversas` | tudo | filtrado por setor | **abre** (só barra se `setores` vazio) |
| `/contatos` | abre | abre | **abre, sem filtro de setor nenhum** |
| `/grupos` | abre | abre | **abre, sem filtro de setor nenhum** |
| `/estoque`, `/compras`, `/estoque-minimo`, `/metricas` | abre | abre | redirecionado |
| `/configuracoes` | abre | vê "Acesso Restrito" — **mas as requisições já rodaram** | redirecionado |

### 3.2 Os furos, por gravidade

**1. O backend não tem uma única verificação de quem está chamando.** Qualquer pessoa com acesso à porta 3000 cria um usuário admin por `curl`. O `token` do login é a string literal `'jwt-token-temporario'` — igual para todo mundo, e o servidor **nunca o lê**. Enquanto isso existir, tudo que está abaixo é cosmético.

**2. A identidade vem do `localStorage`, sem assinatura.** Um atendente abre o F12, escreve `{"tipo":"admin","permissoes":{"setores":["*"]}}`, recarrega — e é admin pleno. Nada no servidor contesta.

**3. A busca ignorava o filtro de setor.** `sessoesService.buscar()` aceita `setoresPermitidos`, mas as duas chamadas reais não passavam o argumento. Bastava **digitar qualquer coisa** na caixa de busca para o atendente de "atendimento" receber sessões de ouvidoria, financeiro e RH — currículos e reclamações inclusive. Sem truque, sem DevTools. **Isto eu já corrigi nesta rodada.**

**4. O backend de conversas (8081) não recebe identidade nenhuma.** O painel baixa **todas** as sessões e esconde no navegador o que não é do setor. Qualquer um na rede lê — e **envia** WhatsApp pelo número da loja.

**5. Setor vazio = ver tudo, não ver nada.** O filtro só roda `if (setores.length > 0)`. Deveria ser o contrário: sem setor, sem conversa.

**6. O código de 4 dígitos do atendente é decorativo.** `GET /auth/atendentes` devolvia o `codigo` em texto claro e o hash da senha, numa rota aberta — e o próprio modal avisa que "a senha é o código cadastrado". Sem rate limit, 10.000 combinações. *(A parte do hash eu já tapei; o resto depende do item 1.)*

**7. Métrica de atendente não é confiável.** O `atendenteId` vem do corpo da requisição. Qualquer um infla os próprios números ou joga atendimento no nome de outro — e é justamente o dado que você usa para avaliar os cinco.

### 3.3 Incoerências do modelo

- `contatos` e `grupos` **não existem** como permissão: estão no menu reaproveitando `conversas`, não aparecem no formulário e não têm guarda de rota. São as duas telas sem **nenhum** filtro de setor.
- A permissão `configuracoes` é oferecida, exigida na rota — e anulada por `tipo !== 'admin'` dentro da tela. Não existe perfil intermediário.
- `hasSessaoPermission` existe, é exportada, é desestruturada em Conversas — e **nunca é chamada**.
- O formulário oferece o tipo `supervisor`; nenhuma linha de código trata esse valor.
- Admin ignora a própria lista de permissões. A lista do admin é ficção — não dá para ter um admin restrito.
- Configurações bloqueia o *render*, não as *requisições*: quem chega na tela já baixou a lista de usuários e de atendentes.

### 3.4 O que eu proponho

**Três papéis fixos, uma dimensão configurável.** Dois eixos de checkbox (7 páginas × 7 setores por pessoa) é mais configuração do que uma loja com 5 atendentes suporta — e é a origem das incoerências acima.

| Papel | Quem | Vê |
|---|---|---|
| **Dono** | você | tudo, inclusive usuários, compras e custo |
| **Supervisor** | 1 pessoa da loja | todas as conversas, contatos, grupos, métricas, estoque mínimo. Não mexe em usuários, não vê custo |
| **Atendente** | os 5 | conversas e contatos **só dos seus setores**; nenhuma métrica além da própria |

`permissoes.paginas` deixa de ser por usuário e vira uma tabela papel→páginas no código. `permissoes.setores` continua por usuário — é a única coisa que muda na vida real (quem cobre ouvidoria hoje). Atendente sem setor = **nenhuma** conversa.

**O código de 4 dígitos:** o ideal é dar **login próprio a cada um dos 5** e aposentar o código. Cinco pessoas não justificam login compartilhado, e a assinatura da resposta e a métrica passam a sair do token em vez do corpo da requisição. Se o balcão exigir máquina única, o código vira token de turno emitido pelo servidor, com bloqueio após 5 erros.

**Onde cada checagem mora:** frontend = conveniência (esconder menu, mostrar 403). Backend = segurança. Hoje o backend não tem nenhuma, então o painel inteiro é uma sugestão.

---

## 4. Ordem que eu recomendo

| # | O quê | Por quê agora |
|---|---|---|
| 1 | Rotacionar senha do Atlas e do admin | estão em claro; é o único passo que não dá para adiar |
| 2 | JWT de verdade + middleware de auth no `server.js` | sem isso, nada de permissão vale |
| 3 | Filtro de setor no backend 8081 + token no `whatsappApi` | mata os furos 3, 4 e 5 de uma vez |
| 4 | Login individual por atendente | conserta métrica e assinatura juntos |
| 5 | Colapsar `paginas` em papéis; fechar `/contatos` e `/grupos` | arrumação do modelo |
| 6 | Rolar o vidro para as outras 7 telas | depois de você aprovar o piloto |

Os passos 1 a 3 resolvem quase toda a exposição. O 4 e o 5 são arrumação.

---

## 5. Arquivos alterados nesta rodada

**Motor do chat:** `hooks/useChat.ts`, `services/chat.service.ts`
**Design system:** `src/index.css`, `tailwind.config.js`
**Estrutura:** `layouts/RootLayout.tsx`, `layouts/components/Header.tsx`, `layouts/components/Sidebar.tsx`
**Conversas:** `pages/Conversas/index.tsx`, `SessaoList.tsx`, `ConversaWindow.tsx`, `MensagemItem.tsx`, `MessageInput.tsx`

Todos passam no parser. **Não rodei `npm run build`** — faça isso antes de publicar; é onde um import que eu não enxerguei daqui apareceria.
