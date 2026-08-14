# FactorCalc

Aplicação PWA para cálculo de operações de factoring (duplicatas, cheques e outros recebíveis), feita para uso em tablet — **100% offline depois da primeira instalação**. Todos os dados ficam no próprio aparelho (IndexedDB); nenhuma funcionalidade depende de servidor, CDN ou internet.

## Stack

React 18 · TypeScript · Vite 6 · Tailwind CSS 4 · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · React Hook Form + Zod · date-fns · jsPDF + autotable · Vitest

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

Há também um smoke test E2E (requer Google Chrome instalado) que percorre o fluxo completo — cliente → operação → salvar → histórico → offline → PDF → backup:

```bash
npm run preview   # em um terminal
npm run smoke     # em outro
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

## Como instalar no tablet Android/Samsung

A PWA precisa ser servida por **HTTPS** (ou localhost). Publique a pasta `dist/` em qualquer hospedagem estática com HTTPS (ex.: Netlify, Vercel, Cloudflare Pages, ou servidor próprio) e então, no tablet:

1. Abra a URL no **Chrome** (ou Samsung Internet).
2. Menu ⋮ → **"Adicionar à tela inicial"** / **"Instalar aplicativo"**.
3. Confirme. O ícone do FactorCalc aparece na tela inicial.
4. Abra o app, aguarde o primeiro carregamento completo — a partir daí pode ativar o **modo avião**: tudo continua funcionando (dados, cálculos, histórico, PDF, backup).

> Importante: os dados ficam no navegador do aparelho. Use **Backup → Exportar backup** periodicamente e guarde o arquivo JSON em local seguro (Drive, e-mail, pendrive).

Para testar na rede local sem publicar: `npm run preview -- --host` e acesse `http://SEU-IP:4173` no tablet (o Service Worker não instala via http remoto, mas serve para avaliar a interface; para o teste offline real, use HTTPS ou o Chrome desktop).

## Como simular o tablet no Chrome DevTools

1. DevTools (F12) → ícone **Toggle device toolbar** (Ctrl/Cmd+Shift+M).
2. Em *Dimensions*, escolha **Galaxy Tab S7/S8** ou defina 1280×800 (horizontal) / 800×1280 (vertical).
3. Teste também 390×844 para smartphone.

## Estrutura do projeto

```
src/
  domain/               ← motor financeiro puro (sem UI, sem banco)
    money.ts            ← valores em centavos (inteiros)
    dayCount.ts         ← dias corridos (preparado para dias úteis na V2)
    calculations/
      discount.ts       ← desconto simples por taxa mensal
      averageTerm.ts    ← prazo médio ponderado
      effectiveRate.ts  ← taxa efetiva (XIRR mensal, Newton + bisseção)
      cashflows.ts      ← montagem dos fluxos de caixa
      methods.ts        ← registro de métodos de cálculo (extensível)
      operation.ts      ← calculateOperation() — única porta de entrada da UI
      __tests__/        ← 20 testes unitários
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
```

## Decisões técnicas

- **Dinheiro em centavos (inteiros)** — somas exatas, sem erro de ponto flutuante; arredondamento só no resultado final de cada parcela de cálculo.
- **Motor de cálculo desacoplado** — a UI só chama `calculateOperation({...})`. Novos métodos (desconto composto, taxa por dentro, fator…) entram registrando uma implementação em `methods.ts`, sem tocar em telas.
- **Taxa efetiva** — TIR com datas irregulares (equivalente a XIRR), expressa em % a.m. com mês comercial de 30 dias; anual = (1+i)¹² − 1. Exibida separada da taxa comercial.
- **Número amigável** `OP-AAAA-NNNNNN` com contador local por ano + UUID interno.
- **PDF sob demanda** — o chunk do jsPDF é carregado só ao gerar o PDF (mas fica precacheado pelo Service Worker, funcionando offline).
- **CSV para Excel BR** — separador `;`, BOM UTF-8 e vírgula decimal.
- **Exclusão de cliente preserva operações** (apenas desvincula).
- **PIN local opcional** (4–6 dígitos, hash SHA-256) em Configurações — proteção de conveniência, sem login online.
- **IOF** — lançado no campo "Outras despesas" na V1.

## Preparado para a V2

- Novos métodos de cálculo (registro em `methods.ts` + união em `CalculationMethod`).
- Dias úteis e calendário local de feriados (`dayCount.ts` já recebe o modo; V1 usa dias corridos).
- Logo e dados completos da empresa no PDF (Configurações já persistem nome/CNPJ).
- Taxa por título editável (campo `rate` já existe no schema).
- Despesas por título na grade (campo `expensesCents` já existe e é calculado).
- Dark mode (tema claro é o principal por decisão de escopo).
