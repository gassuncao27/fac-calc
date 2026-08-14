// Smoke test E2E: dirige o build de produção no Chrome headless.
// Valida o fluxo principal (cliente → operação → títulos → salvar →
// histórico → detalhe) e o funcionamento offline via Service Worker.
// Uso: npm run preview & node scripts/smoke.mjs [--shots-dir=/tmp]
import { chromium } from 'playwright-core';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173';
const shotsDir =
  process.argv.find((a) => a.startsWith('--shots-dir='))?.split('=')[1] ?? '/tmp/factorcalc-smoke';

const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 }, // tablet ~11" horizontal
  locale: 'pt-BR',
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

// 1. Primeira tela (empty state)
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('text=Comece criando sua primeira operação', { timeout: 15000 });
check('Empty state do dashboard renderiza', true);
await page.screenshot({ path: `${shotsDir}/01-dashboard-vazio.png` });

// 2. Cadastrar cliente
await page.click('a[href="/clientes"]');
await page.click('button:has-text("Novo cliente")');
await page.fill('input[placeholder="Ex.: Comercial ABC Ltda"]', 'Empresa Teste Ltda');
await page.click('button:has-text("Cadastrar cliente")');
await page.waitForSelector('text="Cliente cadastrado."');
await page.waitForSelector('[role="dialog"]', { state: 'detached' });
check('Cliente criado e persistido', await page.isVisible('text=Empresa Teste Ltda'));
await page.screenshot({ path: `${shotsDir}/02-clientes.png` });

// 3. Nova operação com 2 títulos
await page.click('a[href="/operacoes/nova"]');
await page.waitForSelector('text=Nova operação');
await page.selectOption('select[aria-label="Cliente"]', { label: 'Empresa Teste Ltda' });

// data da operação fixa para valores previsíveis
await page.fill('input[type="date"] >> nth=0', '2026-08-14');

await page.click('button:has-text("Adicionar título")');
await page.fill('[data-row="0"][data-col="value"]', '10000');
await page.fill('[data-row="0"][data-col="due"]', '2026-09-28'); // 45 dias

await page.click('button:has-text("Adicionar título")');
await page.fill('[data-row="1"][data-col="value"]', '15000');
await page.fill('[data-row="1"][data-col="due"]', '2026-09-13'); // 30 dias

// taxa 3% já vem do padrão; confere resumo em tempo real:
// desconto = 450 + 450 = 900 → líquido 24.100
await page.waitForSelector('text=R$ 24.100,00');
check('Resumo em tempo real: valor líquido R$ 24.100,00', true);
const summaryText = await page.textContent('main aside');
check('Resumo exibe taxa efetiva mensal', /Taxa efetiva/.test(summaryText ?? ''));
await page.screenshot({ path: `${shotsDir}/03-nova-operacao.png` });

// 4. Salvar
await page.click('button:has-text("Salvar operação")');
await page.waitForSelector('text=/Operação OP-\\d{4}-\\d{6} salva/');
await page.waitForSelector('text=Valor líquido');
check('Operação salva com número amigável', true);
await page.screenshot({ path: `${shotsDir}/04-detalhe.png` });

// 5. Histórico
await page.click('a[href="/operacoes"]');
await page.waitForSelector('text=/1 operação registrada/');
check('Histórico lista a operação', await page.isVisible('text=Empresa Teste Ltda'));
await page.screenshot({ path: `${shotsDir}/05-historico.png` });

// 6. Aguarda Service Worker ativo e testa OFFLINE
await page.goto(BASE);
await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
  timeout: 20000,
});
check('Service Worker ativo e controlando a página', true);

await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Operações recentes', { timeout: 15000 });
check('Offline: página recarrega servida pelo Service Worker', true);
// navigator.onLine nem sempre é emulado pelo setOffline; só valida o badge quando for
const navigatorOffline = await page.evaluate(() => !navigator.onLine);
if (navigatorOffline) {
  check('Offline: badge "Modo offline" visível', await page.isVisible('text=Modo offline'));
} else {
  // dispara o evento manualmente para validar o componente do badge
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  check('Badge "Modo offline" renderiza no evento offline', await page.isVisible('text=Modo offline'));
}
check('Offline: dados do IndexedDB acessíveis', await page.isVisible('text=Empresa Teste Ltda'));

// 7. Nova operação offline
await page.click('a[href="/operacoes/nova"]');
await page.click('button:has-text("Adicionar título")');
await page.fill('[data-row="0"][data-col="value"]', '5000');
await page.click('button:has-text("Salvar operação")');
await page.waitForSelector('text=/Operação OP-\\d{4}-\\d{6} salva/');
check('Offline: nova operação criada e salva', true);
await page.screenshot({ path: `${shotsDir}/06-offline.png` });

// 8. PDF offline (na tela de detalhe da operação recém-criada)
const [pdfDownload] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  page.click('button:has-text("PDF")'),
]);
check('Offline: PDF gerado', pdfDownload.suggestedFilename().endsWith('.pdf'), pdfDownload.suggestedFilename());

// 9. Backup offline
await page.click('a[href="/backup"]');
const [backupDownload] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  page.click('button:has-text("Exportar backup")'),
]);
check(
  'Offline: backup JSON exportado',
  /^factorcalc-backup-\d{4}-\d{2}-\d{2}\.json$/.test(backupDownload.suggestedFilename()),
  backupDownload.suggestedFilename(),
);
await context.setOffline(false);

const realErrors = errors.filter(
  (e) => !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED|ERR_FAILED/.test(e),
);
check('Sem erros de JavaScript no console', realErrors.length === 0, realErrors.join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
process.exit(failed.length > 0 ? 1 : 0);
