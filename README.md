# FactorCalc

Aplicação PWA para cálculo de operações de factoring (duplicatas, cheques e outros recebíveis), feita para uso em tablet — **100% offline depois da primeira instalação**. Todos os dados ficam no próprio aparelho (IndexedDB); nenhuma funcionalidade depende de servidor, CDN ou internet.

## Stack

React 18 · TypeScript · Vite 6 · Tailwind CSS 3 · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · React Hook Form + Zod · date-fns · jsPDF + autotable · Vitest

## Instalação

Pré-requisitos: **Node.js 20+** e npm.

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

Abre em `http://localhost:5173`. Em **Configurações** há um bloco (apenas em dev) para carregar **dados de demonstração** (3 clientes, 5 operações) e para apagar todos os dados.

## Build de produção

```bash
npm run build
```

Gera `dist/` com todos os assets, ícones, manifest e Service Worker. Nenhum recurso externo é referenciado — fontes usam a pilha do sistema.

## Preview do build

```bash
npm run preview
```

Abre em `http://localhost:4173`. **É neste modo que o Service Worker/PWA funciona** (não no `npm run dev`).

## Testes

```bash
npm test          # testes unitários do motor financeiro (Vitest)
npm run lint      # ESLint
npm run typecheck # TypeScript
```

Há também dois testes de navegador (requerem Google Chrome instalado):

```bash
npm run preview:pages   # em um terminal (serve o build numa subpasta, como o Pages)

npm run smoke        # fluxo completo: cliente → operação → salvar → histórico
                     # → offline → PDF → backup → fechar/reabrir offline
npm run responsive   # abre todas as páginas em 9 larguras (390px … 1920px) e
                     # falha se algo transbordar ou gerar rolagem horizontal
```

## Como testar a PWA (Chrome desktop)

1. `npm run build && npm run preview`
2. Abra `http://localhost:4173` no Chrome.
3. DevTools → **Application → Service Workers**: confirme o worker *activated*.
4. Na barra de endereço aparece o ícone de **instalar** (⊕). Clique para instalar como app.

## Como testar offline

1. Com a página carregada ao menos uma vez, abra DevTools → **Network** → marque **Offline**.
2. Recarregue a página (F5): a aplicação continua abrindo, com o badge discreto "Modo offline".
3. Crie operações, consulte o histórico, gere PDF e exporte backup — tudo funciona sem rede.

Checklist completo validado: instalar → criar cliente → criar operação → salvar → ficar offline → recarregar → fechar/abrir → consultar → nova operação offline → PDF offline → backup offline.

## Layout responsivo

A largura útil **não** é a largura da tela: a sidebar ocupa 240px e, nas telas maiores, o painel de Resumo ocupa mais 364px ao lado. Por isso os breakpoints não são de viewport puro — usar `lg:grid-cols-3` produzia colunas de 91px em 1024px, com os campos se sobrepondo.

O projeto resolve isso de duas formas:

- **Breakpoint `wide`** (em `tailwind.config.js`): significa "a coluna do formulário tem pelo menos ~880px". Como a largura útil cai quando o Resumo entra ao lado, ele é definido em duas faixas de viewport.
- **Tabelas viram cartões** quando não há largura: a grade de títulos, o histórico e os títulos da tela de detalhe alternam entre tabela e lista de cartões via `useMediaQuery`, renderizando só uma das duas (nunca escondendo com CSS, o que duplicaria os campos).

Rode `npm run responsive` após mexer em layout — ele falha se algum texto transbordar.

## Compatibilidade de navegadores

O app é compilado para **Safari 14+ / iPadOS 14+**, para rodar também em iPads antigos que não recebem mais atualizações.

Por isso o projeto usa **Tailwind CSS 3** e não a v4: a v4 gera CSS com `@property`, `oklch()`, `color-mix()` e `@layer`, que exigem **Safari 16.4+** — num iPad mais antigo o Safari descarta essas regras e a página aparece praticamente sem estilo. O `build.target`/`cssTarget` do Vite também estão fixados em `safari14`.

Se um dia migrar para Tailwind v4, verifique antes em qual iPad o app será usado.

## Como funciona offline (o modelo do app)

| Etapa | Precisa de internet? |
|---|---|
| Primeiro acesso ao endereço do Pages (baixa o app) | **Sim, uma única vez** |
| Instalar na tela de início | Não |
| Uso diário: cadastrar, calcular, salvar, PDF, backup | **Não, nunca** |
| Receber atualizações do app | Só quando houver rede (automático) |

O **Service Worker** guarda os arquivos do app no aparelho no primeiro carregamento; o **IndexedDB** guarda clientes, operações e configurações localmente. O GitHub Pages entrega apenas os arquivos estáticos — **nenhum dado de cliente sai do aparelho**.

Cada aparelho tem a sua própria base de dados: não há sincronização entre usuários. Para transferir, use **Exportar backup** em um e **Restaurar backup** no outro.

### Persistência dos dados

Na inicialização o app chama `navigator.storage.persist()`, marcando os dados como não descartáveis. A tela **Backup** mostra o status:

- 🟢 **"Dados protegidos neste aparelho"** — o sistema não vai apagá-los para liberar espaço.
- 🟡 **"Dados sem proteção"** — o app está sendo usado como aba do navegador. No iOS, dados de sites não instalados podem ser apagados após ~7 dias sem uso; instalar na Tela de Início resolve.

## Publicar no GitHub Pages

O app é totalmente estático (sem backend, sem banco), então o GitHub Pages serve bem.

**1. Envie o projeto para o GitHub** (repositório público ou privado — o Pages funciona nos dois em contas Pro; em conta gratuita, use público):

```bash
git init -b main
git add .
git commit -m "FactorCalc"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

**2. Ative o Pages:** no GitHub, vá em **Settings → Pages → Build and deployment** e em *Source* selecione **GitHub Actions**.

Pronto. O workflow em `.github/workflows/deploy.yml` roda a cada `push` na `main`: valida lint, tipos e os testes do motor financeiro e, se tudo passar, publica. O endereço final é:

```
https://SEU_USUARIO.github.io/SEU_REPO/
```

Acompanhe o progresso na aba **Actions**. O primeiro deploy leva ~2 minutos.

> Não é preciso configurar o nome do repositório em lugar nenhum: o build usa caminhos relativos (`base: './'`) e rotas em hash, então funciona em qualquer subpasta.

Para conferir localmente como ficará no Pages (servindo numa subpasta, sem fallback de SPA, igual ao GitHub):

```bash
npm run build
npm run preview:pages     # http://localhost:4174/fac-calc/
```

## Como instalar no iPad (Safari)

1. Abra o endereço do Pages no **Safari** (no iOS, a instalação de PWA só funciona pelo Safari).
2. Toque no botão **Compartilhar** (quadrado com seta para cima).
3. Escolha **"Adicionar à Tela de Início"** e confirme.
4. Abra o FactorCalc pelo ícone na tela de início e aguarde o primeiro carregamento completo.

A partir daí funciona em modo avião, em tela cheia, sem barra do navegador.

> **Importante no iOS:** só sites *adicionados à Tela de Início* têm armazenamento persistente. Se o app for usado apenas como aba do Safari, o iOS pode apagar os dados após ~7 dias sem uso. Instale pelo passo a passo acima e use **Backup → Exportar backup** periodicamente.

## Como instalar no Android/Samsung

1. Abra o endereço do Pages no **Chrome**.
2. Menu ⋮ → **"Instalar aplicativo"** / **"Adicionar à tela inicial"**.
3. Confirme e abra pelo ícone. Após o primeiro carregamento, funciona offline.

## Como simular o tablet no Chrome DevTools

1. DevTools (F12) → ícone **Toggle device toolbar** (Ctrl/Cmd+Shift+M).
2. Em *Dimensions*, escolha **Galaxy Tab S7/S8** ou defina 1280×800 (horizontal) / 800×1280 (vertical).
3. Teste também 390×844 para smartphone.

## Estrutura do projeto

```
src/
  domain/               ← motor financeiro puro (sem UI, sem banco)
    money.ts            ← valores em centavos (inteiros)
    dayCount.ts         ← dias corridos e úteis; datas seguras contra entrada incompleta
    calculations/
      discount.ts       ← desconto simples por taxa mensal
      averageTerm.ts    ← prazo médio ponderado
      effectiveRate.ts  ← taxa efetiva (XIRR mensal, Newton + bisseção)
      cashflows.ts      ← fluxos de caixa (entrada na compensação, não no vencimento)
      iof.ts            ← IOF/Crédito (diário por título + adicional)
      methods.ts        ← registro de métodos de cálculo (extensível)
      operation.ts      ← calculateOperation() — única porta de entrada da UI
      __tests__/        ← 57 testes unitários
  db/                   ← Dexie/IndexedDB (schema + dados de demonstração)
  services/             ← operações, clientes, configurações, PDF, CSV, backup
  components/           ← UI reutilizável (CurrencyInput, PercentInput, ReceivableTable,
                          OperationSummary, ConfirmDialog, Toast, EmptyState…)
  pages/                ← Dashboard, Nova operação, Histórico, Detalhe, Clientes,
                          Configurações, Backup
  hooks/ · utils/ · types/ · constants/
scripts/
  generate-icons.mjs    ← gera os ícones PNG da PWA (sem dependências)
  smoke.mjs             ← smoke test E2E (Chrome headless)
  serve-subpath.mjs     ← simula o GitHub Pages numa subpasta
```

> **Os dados não são compartilhados entre aparelhos.** Cada dispositivo guarda os seus próprios clientes e operações no navegador. Para transferir, use **Exportar backup** em um e **Restaurar backup** no outro.

## Decisões técnicas

- **Dinheiro em centavos (inteiros)** — somas exatas, sem erro de ponto flutuante; arredondamento só no resultado final de cada parcela de cálculo.
- **Motor de cálculo desacoplado** — a UI só chama `calculateOperation({...})`. Novos métodos (desconto composto, taxa por dentro, fator…) entram registrando uma implementação em `methods.ts`, sem tocar em telas.
- **Taxa efetiva** — TIR com datas irregulares, expressa em % a.m. com mês comercial de 30 dias; anual = (1+i)¹² − 1, ou seja **base 360**. Não é idêntica ao XIRR de planilha, que usa base 365 — por isso a interface diz "base 360". Calculada sobre o valor líquido efetivamente entregue (já descontado o IOF, quando incide).
- **Número amigável** `OP-AAAA-NNNNNN` com contador local por ano + UUID interno.
- **PDF sob demanda** — o chunk do jsPDF é carregado só ao gerar o PDF (mas fica precacheado pelo Service Worker, funcionando offline).
- **CSV para Excel BR** — separador `;`, BOM UTF-8 e vírgula decimal.
- **Exclusão de cliente preserva operações** (apenas desvincula).
- **PIN local opcional** (4–6 dígitos, hash SHA-256) em Configurações — proteção de conveniência, sem login online.
- **Compensação D+x** — dias somados ao vencimento de cada título até o dinheiro ficar disponível (cheque que compensa em D+2, por exemplo). Alonga o prazo, aumenta o deságio e reduz o líquido. Vale para a operação inteira, com padrão configurável (vem **D+2 em dias úteis**) e ajuste caso a caso em Nova operação. O prazo médio, o IOF e a **taxa efetiva** passam a usar a data de compensação, não a de vencimento — é quando o dinheiro de fato entra.
- **Dias úteis na compensação** — em `business`, D+x pula sábados e domingos (sexta + D+2 = terça, não domingo); se o próprio vencimento cair no fim de semana, a contagem parte do próximo dia útil. O critério fica gravado **em cada operação** (`compensationMode`), então mudar o padrão em Configurações não altera o valor de operações já fechadas. Operações salvas antes deste campo mantêm `calendar`/D+0, sem alteração alguma.
- **Feriados ainda não entram na conta.** Só fins de semana. Um D+2 que caia no Carnaval, na Sexta-Feira Santa ou no Corpus Christi vai errar — ver "Preparado para a V2".
- **IOF automático** — calculado pelo motor, não digitado à mão. Estrutura do Decreto 6.306/2007: alíquota **diária** aplicada ao prazo de cada título (limitada a 365 dias) mais a alíquota **adicional** fixa, ambas incidindo sobre o **valor líquido entregue ao cedente**. A base é apurada *antes* do próprio IOF, para não criar circularidade. O principal é apurado **por título** (cada um tem prazo próprio), rateando a base pelo líquido que cada título gera.
- **Alíquotas de IOF são configuráveis, nunca constantes no código** — mudam por decreto. Ficam em Configurações, pré-preenchidas com 0,0082% a.d. + 0,95% adicional; **confira as vigentes antes de usar**. As alíquotas usadas ficam gravadas em cada operação, então recalcular uma operação antiga não altera o que foi fechado.
- **"Empresa é factoring"** (Configurações) faz novas operações já virem com o IOF marcado; o usuário pode desmarcar caso a caso.
- **Tailwind v3 + alvo Safari 14** — compatibilidade com iPads antigos (ver seção acima). Unidades `dvh` têm fallback em `vh` via `@supports`, e os campos usam fonte de 16px para o iOS não dar zoom ao focar.
- **Caminhos relativos + rotas em hash** (`base: './'`, `HashRouter`) — o build roda em qualquer subpasta sem reconfiguração, e recarregar uma rota profunda nunca cai no 404 do GitHub Pages (que não tem fallback de SPA).

## Preparado para a V2

- Novos métodos de cálculo (registro em `methods.ts` + união em `CalculationMethod`).
- **Calendário de feriados local e editável** — a compensação já pula fins de semana (`addBusinessDaysISO`), mas não feriados. Como o app precisa funcionar offline, não dá para consultar API: seria uma tela nova com os feriados nacionais pré-carregados, editável e incluída no backup. O ponto de mudança é único: `addCompensationDays` em `dayCount.ts`.
- Logo e dados completos da empresa no PDF (Configurações já persistem nome/CNPJ).
- Taxa por título editável (campo `rate` já existe no schema).
- Despesas por título na grade (campo `expensesCents` já existe e é calculado).
- Dark mode (tema claro é o principal por decisão de escopo).
