// Captura telas em viewports de tablet retrato e smartphone para revisão visual.
import { chromium } from 'playwright-core';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173';
const shotsDir =
  process.argv.find((a) => a.startsWith('--shots-dir='))?.split('=')[1] ?? '/tmp/factorcalc-smoke';

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function capture(name, viewport, path, actions = async () => {}) {
  const context = await browser.newContext({ viewport, locale: 'pt-BR' });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await actions(page);
  await page.screenshot({ path: `${shotsDir}/${name}.png`, fullPage: false });
  await context.close();
  console.log(`📸 ${name}`);
}

const fillOperation = async (page) => {
  await page.click('button:has-text("Adicionar título")');
  await page.fill('[data-row="0"][data-col="value"]', '10000');
  await page.click('button:has-text("Adicionar título")');
  await page.fill('[data-row="1"][data-col="value"]', '15000');
  await page.waitForTimeout(300);
};

// Tablet 11" retrato
await capture('07-tablet-retrato-nova-op', { width: 800, height: 1280 }, '/operacoes/nova', fillOperation);
// Smartphone
await capture('08-mobile-dashboard', { width: 390, height: 844 }, '/');
await capture('09-mobile-nova-op', { width: 390, height: 844 }, '/operacoes/nova', fillOperation);

await browser.close();
