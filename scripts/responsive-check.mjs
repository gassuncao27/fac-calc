/**
 * Varredura de responsividade: abre todas as páginas em várias larguras e
 * falha se algum conteúdo transbordar sua caixa, se um campo de formulário
 * vazar por cima do vizinho, ou se a página ganhar rolagem horizontal.
 * Truncamento intencional (reticências) é ignorado.
 *
 * Roda em Chromium e, quando disponível, também em WebKit nos tamanhos de
 * iPad — o motor do Safari dimensiona controles nativos (input[type=date],
 * select) de forma diferente, e é lá que o app é usado.
 * Para instalar o WebKit: node node_modules/playwright-core/cli.js install webkit
 *
 * Uso:  npm run preview:pages   (em um terminal)
 *       npm run responsive      (em outro)
 */
import { chromium, webkit } from 'playwright-core';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4174/fac-calc/';
const shotsDir = process.argv.find((a) => a.startsWith('--shots-dir='))?.split('=')[1] ?? null;

const LARGURAS = [
  [390, 844, 'celular'],
  [768, 1024, 'tablet pequeno'],
  [834, 1194, 'iPad retrato'],
  [1024, 768, 'limiar 1024'],
  [1194, 834, 'iPad paisagem'],
  [1280, 800, 'notebook'],
  [1360, 900, 'limiar tabela'],
  [1548, 900, 'desktop'],
  [1920, 1000, 'desktop grande'],
];

const PAGINAS = [
  ['início', '#/'],
  ['operações', '#/operacoes'],
  ['nova operação', '#/operacoes/nova'],
  ['clientes', '#/clientes'],
  ['configurações', '#/configuracoes'],
  ['feriados', '#/feriados'],
  ['backup', '#/backup'],
];

let falhas = 0;

async function varrer(motor, larguras, rotuloMotor, opcoesExtras = {}) {
  const browser = await motor.launch({ headless: true, ...opcoesExtras });
  console.log(`\n— ${rotuloMotor} —`);
  for (const [width, height, rotulo] of larguras) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', hasTouch: true });
  const page = await context.newPage();

  // Popula dados realistas (nome longo, valor na casa do milhão)
  await page.goto(`${BASE}#/clientes`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Novo cliente")');
  await page.fill('input[placeholder="Ex.: Comercial ABC Ltda"]', 'Indústria Metalúrgica Paulista S.A.');
  await page.click('button:has-text("Cadastrar cliente")');
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });
  await page.goto(`${BASE}#/operacoes/nova`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Adicionar título")');
  await page.fill('[data-row="0"][data-col="value"]', '1500000');
  await page.click('button:has-text("Salvar operação")');
  await page.waitForSelector('text=Valor líquido');

  const problemas = [];
  for (const [nome, rota] of PAGINAS) {
    await page.goto(BASE + rota, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const cortados = [...document.querySelectorAll('td,th,span,p,dd,dt,h1,h2,button,label')]
        .filter((el) => {
          if (el.scrollWidth <= el.clientWidth + 2 || el.clientWidth === 0) return false;
          const cs = getComputedStyle(el);
          return !(cs.textOverflow === 'ellipsis' && cs.overflow === 'hidden');
        })
        .map((el) => (el.textContent || '').trim().slice(0, 22));

      // Campos que vazam para fora da própria caixa e invadem o vizinho.
      // É o que acontece no iOS com input[type=date] sem appearance:none.
      const vazando = [...document.querySelectorAll('input,select,textarea')]
        .filter((el) => {
          const pai = el.parentElement;
          if (!pai || el.clientWidth === 0) return false;
          const c = el.getBoundingClientRect();
          const p = pai.getBoundingClientRect();
          return c.right > p.right + 2 || c.left < p.left - 2;
        })
        .map((el) => `${el.tagName.toLowerCase()}[${el.type || ''}] ${el.getAttribute('aria-label') || ''}`.trim());

      return {
        cortados: [...new Set(cortados)].slice(0, 2),
        vazando: [...new Set(vazando)].slice(0, 2),
        scrollH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    if (r.cortados.length || r.vazando.length || r.scrollH) {
      const detalhes = [
        r.cortados.length ? `cortado ${JSON.stringify(r.cortados)}` : '',
        r.vazando.length ? `campo vazando ${JSON.stringify(r.vazando)}` : '',
        r.scrollH ? 'scroll horizontal' : '',
      ].filter(Boolean).join(' · ');
      problemas.push(`${nome}: ${detalhes}`);
    }
    if (shotsDir) await page.screenshot({ path: `${shotsDir}/${width}-${nome}.png` });
  }

  if (problemas.length) falhas++;
  console.log(
    `${problemas.length ? '❌' : '✅'} ${String(width).padStart(4)}px ${rotulo.padEnd(15)} ${
      problemas.join('  ') || 'todas as páginas limpas'
    }`,
  );
  await context.close();
  }
  await browser.close();
}

await varrer(chromium, LARGURAS, 'Chromium', { channel: 'chrome' });

// WebKit (motor do Safari) nos tamanhos de iPad — onde o app é realmente usado
const LARGURAS_IPAD = LARGURAS.filter(([w]) => w === 834 || w === 1194);
try {
  await varrer(webkit, LARGURAS_IPAD, 'WebKit (Safari) — iPad');
} catch (error) {
  console.log('\nℹ️  WebKit não instalado; passagem do Safari pulada.');
  console.log('   node node_modules/playwright-core/cli.js install webkit');
  if (process.env.STRICT_WEBKIT) throw error;
}

console.log(
  falhas === 0
    ? '\n✅ Nenhum transbordamento em nenhuma largura.'
    : `\n❌ ${falhas} largura(s) com problema.`,
);
process.exit(falhas ? 1 : 0);
