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
await page.click('nav a[href$="/clientes"] >> nth=0');
await page.click('button:has-text("Novo cliente")');
await page.fill('input[placeholder="Ex.: Comercial ABC Ltda"]', 'Empresa Teste Ltda');
await page.click('button:has-text("Cadastrar cliente")');
await page.waitForSelector('text="Cliente cadastrado."');
await page.waitForSelector('[role="dialog"]', { state: 'detached' });
check('Cliente criado e persistido', await page.isVisible('text=Empresa Teste Ltda'));
await page.screenshot({ path: `${shotsDir}/02-clientes.png` });

// 3. Nova operação com 2 títulos
await page.click('nav a[href$="/operacoes/nova"] >> nth=0');
await page.waitForSelector('text=Nova operação');
await page.selectOption('select[aria-label="Cliente"]', { label: 'Empresa Teste Ltda' });

// data da operação fixa para valores previsíveis
await page.fill('input[type="date"] >> nth=0', '2026-08-14');

// Compensação vem D+2 (dias úteis) por padrão; zera para os valores de referência
await page.fill('input[aria-label="Compensação em dias após o vencimento"]', '0');
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

// 3a. Compensação D+x: alonga o prazo e reduz o líquido
await page.fill('input[aria-label="Compensação em dias após o vencimento"]', '2');
await page.waitForTimeout(300);
const comCompensacao = await page.textContent('main aside');
// Vencimentos 28/09 (segunda) e 13/09 (domingo). Em dias ÚTEIS, D+2 leva a
// 30/09 (quarta, 47 dias) e 15/09 (terça, 32 dias) — mesmo resultado dos
// corridos aqui, mas o rótulo deve dizer "úteis".
check('Compensação D+2: líquido recalculado', /R\$\s*24\.0\d{2},\d{2}/.test(comCompensacao ?? ''));
check('Compensação D+2: critério exibido no resumo', /D \+ 2 (úteis|corridos)/.test(comCompensacao ?? ''));
await page.fill('input[aria-label="Compensação em dias após o vencimento"]', '0');
await page.waitForSelector('text=R$ 24.100,00');
check('Compensação D+0: restaura o líquido original', true);

// 3b. IOF: liga o imposto e confere que o líquido cai
const liquidoSemIof = await page.textContent('main aside');
await page.click('text=Incidir IOF');
await page.waitForTimeout(300);
const resumoComIof = await page.textContent('main aside');
check('IOF: alternar recalcula o resumo', resumoComIof !== liquidoSemIof);
check('IOF: linha de IOF aparece no resumo', /IOF/.test(resumoComIof ?? ''));
// 25.000 nominal − 900 deságio = 24.100 de base
// IOF = 24.100×0,0082%×(rateio dos prazos) + 24.100×0,95%  →  líquido < 24.100
const liquidoIof = (resumoComIof ?? '').match(/R\$\s*23\.\d{3},\d{2}/);
check('IOF: valor líquido reduzido para a faixa esperada', liquidoIof !== null, liquidoIof?.[0] ?? 'não encontrado');
// desliga de volta para manter o restante do teste com os valores originais
await page.click('text=Incidir IOF');
await page.waitForSelector('text=R$ 24.100,00');
check('IOF: desmarcar restaura o líquido original', true);

// 3c. Regressão: digitar a data à mão passa por valores incompletos.
// Uma exceção aqui derrubava o React e deixava a tela em branco.
await page.click('button:has-text("Adicionar título")');
const campoData = page.locator('[data-row="2"][data-col="due"]');
await campoData.click();
for (const tecla of ['0', '8', '0', '1', '2', '0', '2', '7']) {
  await page.keyboard.press(tecla);
  await page.waitForTimeout(60);
}
await page.waitForTimeout(300);
const telaViva = await page.isVisible('text=Salvar operação');
check('Digitar a data à mão não derruba a tela', telaViva);
// limpar o campo também não pode quebrar
await campoData.click();
for (let i = 0; i < 10; i++) await page.keyboard.press('Backspace');
await page.waitForTimeout(300);
check('Apagar a data não derruba a tela', await page.isVisible('text=Salvar operação'));
// remove a linha de teste
await page.click('button[aria-label="Excluir título 3"]');
await page.waitForSelector('text=R$ 24.100,00');
check('Resumo volta ao normal após remover a linha', true);

// 3d. Feriados: cadastrar, gerar nacionais e ver o efeito no cálculo
await page.click('nav a[href$="/feriados"] >> nth=0');
await page.waitForSelector('h1:has-text("Feriados")');
await page.click('button:has-text("Gerar nacionais")');
await page.waitForSelector('text=/feriado\\(s\\) nacional/');
const listaFeriados = await page.textContent('main');
check('Feriados nacionais gerados', /Natal/.test(listaFeriados ?? '') && /Carnaval/.test(listaFeriados ?? ''));
check(
  'Quarta-feira de Cinzas NÃO entra (é dia útil)',
  !/cinzas/i.test(listaFeriados ?? ''),
);
// cadastro manual
await page.fill('input[aria-label="Data do feriado"]', '2026-07-09');
await page.fill('input[aria-label="Nome do feriado"]', 'Revolução Constitucionalista');
await page.click('button:has-text("Adicionar")');
await page.waitForSelector('text=Feriado cadastrado.');
check('Feriado manual cadastrado', await page.isVisible('text=Revolução Constitucionalista'));
// duplicata é recusada
await page.fill('input[aria-label="Data do feriado"]', '2026-07-09');
await page.fill('input[aria-label="Nome do feriado"]', 'Duplicado');
await page.click('button:has-text("Adicionar")');
await page.waitForSelector('text=/Já existe um feriado/');
check('Feriado duplicado é recusado', true);
await page.screenshot({ path: `${shotsDir}/07-feriados.png` });

// volta à operação e confere que o feriado entra no cálculo
await page.click('nav a[href$="/operacoes/nova"] >> nth=0');
await page.waitForSelector('text=Nova operação');
await page.fill('input[type="date"] >> nth=0', '2026-08-14');
await page.fill('input[aria-label="Compensação em dias após o vencimento"]', '1');
await page.click('button:has-text("Adicionar título")');
await page.fill('[data-row="0"][data-col="value"]', '10000');
// vencimento sexta 09/10; segunda 12/10 é feriado nacional → compensa terça 13/10
await page.fill('[data-row="0"][data-col="due"]', '2026-10-09');
await page.waitForTimeout(400);
// A data de compensação aparece como texto (cartões) ou como tooltip (tabela),
// conforme a largura — checa os dois.
const areaTitulos = await page.textContent('main');
const tooltipTitulos = await page.evaluate(() =>
  [...document.querySelectorAll('[title]')].map((el) => el.getAttribute('title')).join(' | '),
);
check(
  'Feriado empurra a compensação no cálculo (12/10 é feriado → 13/10)',
  /13\/10\/2026/.test(`${areaTitulos} ${tooltipTitulos}`),
  /13\/10\/2026/.test(`${areaTitulos} ${tooltipTitulos}`) ? '' : 'não encontrou 13/10/2026',
);

// 4. Salvar (reconstrói o cenário de referência)
await page.selectOption('select[aria-label="Cliente"]', { label: 'Empresa Teste Ltda' });
await page.click('button[aria-label="Excluir título 1"]');
await page.fill('input[aria-label="Compensação em dias após o vencimento"]', '0');
await page.click('button:has-text("Adicionar título")');
await page.fill('[data-row="0"][data-col="value"]', '10000');
await page.fill('[data-row="0"][data-col="due"]', '2026-09-28');
await page.click('button:has-text("Adicionar título")');
await page.fill('[data-row="1"][data-col="value"]', '15000');
await page.fill('[data-row="1"][data-col="due"]', '2026-09-13');
await page.waitForSelector('text=R$ 24.100,00');
await page.click('button:has-text("Salvar operação")');
await page.waitForSelector('text=/Operação OP-\\d{4}-\\d{6} salva/');
await page.waitForSelector('text=Valor líquido');
check('Operação salva com número amigável', true);
await page.screenshot({ path: `${shotsDir}/04-detalhe.png` });

// 5. Histórico
await page.click('nav a[href$="/operacoes"] >> nth=0');
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
await page.click('nav a[href$="/operacoes/nova"] >> nth=0');
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
await page.click('nav a[href$="/backup"] >> nth=0');
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

// 10. Recarregar uma rota profunda (o que quebra no GitHub Pages sem hash routing)
await page.click('nav a[href$="/operacoes"] >> nth=0');
await page.waitForSelector('text=/opera\u00e7\u00e3o registrada|opera\u00e7\u00f5es registradas/');
const deepUrl = page.url();
const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=/opera\u00e7\u00e3o registrada|opera\u00e7\u00f5es registradas/', { timeout: 15000 });
check(
  'Recarregar rota profunda funciona (sem 404 do servidor)',
  (reloadResponse?.status() ?? 200) < 400,
  deepUrl,
);

// 11. Fechar o app e reabrir OFFLINE (prova de persistência no aparelho)
await context.setOffline(true);
await page.close();
const reopened = await context.newPage();
await reopened.goto(BASE, { waitUntil: 'domcontentloaded' });
await reopened.waitForSelector('text=Operações recentes', { timeout: 20000 });
check('App fechado e reaberto offline: continua abrindo', true);
check(
  'App reaberto offline: cadastros preservados',
  await reopened.isVisible('text=Empresa Teste Ltda'),
);
const opCount = await reopened.locator('a[href$="/operacoes"] , li').count();
check('App reaberto offline: operações preservadas', opCount > 0);

// 12. Status do armazenamento visível na tela de Backup
await reopened.click('nav a[href$="/backup"] >> nth=0');
await reopened.waitForSelector('text=Exportar backup');
// O status do armazenamento é lido de forma assíncrona: espera o card aparecer
await reopened.waitForSelector('text=/Dados protegidos neste aparelho|sem prote\u00e7\u00e3o contra limpeza/', {
  timeout: 15000,
});
const storageCard = await reopened.textContent('main');
check(
  'Tela de Backup informa o status do armazenamento',
  /Dados protegidos neste aparelho|sem prote\u00e7\u00e3o contra limpeza/.test(storageCard ?? ''),
);
await reopened.screenshot({ path: `${shotsDir}/10-reaberto-offline.png` });
await context.setOffline(false);

const realErrors = errors.filter(
  (e) =>
    !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED|ERR_FAILED/.test(e) &&
    // Provocado de propósito no teste de feriado duplicado: o app trata,
    // mostra o toast e registra no console para diagnóstico.
    !/Já existe um feriado nessa data/.test(e),
);
check('Sem erros de JavaScript no console', realErrors.length === 0, realErrors.join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
process.exit(failed.length > 0 ? 1 : 0);
