// Browser test of the demo page with simulated sensors (Playwright).
// Run with: npm run test:browser. Set CHROME_PATH to use an installed Chrome instead of
// Playwright's bundled browser. Screenshots are written to test/screenshots/ (git-ignored).
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  try {
    const body = await readFile(join(root, path.endsWith('/') || path === '' ? join(path, 'index.html') : path));
    res.writeHead(200, { 'content-type': types[extname(path) || '.html'] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/demo/`;
const shots = join(root, 'test', 'screenshots');
await mkdir(shots, { recursive: true });

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const phone = {
  viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
};
const errors = [];
let passed = 0;

async function open(query) {
  const context = await browser.newContext(phone);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${query}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${query}: ${m.text()}`); });
  await page.goto(base + '?' + query);
  return page;
}
const value = (page, key) => page.locator(`dd[data-key="${key}"]`).textContent();
const slider = (page, name, v) => page.locator(`#sim-panel input[name=${name}]`).evaluate((el, x) => { el.value = String(x); el.dispatchEvent(new Event('input')); }, v);
async function check(name, fn) {
  try { await fn(); passed++; console.log('ok  -', name); }
  catch (error) { console.log('FAIL-', name); throw error; }
}

try {
  await check('map mode: intro, start, heading follows the phone', async () => {
    const page = await open('mode=map&sim=1&north=magnetic');
    await page.getByRole('heading', { name: 'Before you start' }).waitFor();
    await page.screenshot({ path: join(shots, 'intro-light.png') });
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await page.locator('.gk-overlay').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('0°'));
    await slider(page, 'alpha', 90);
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('270°'));
    assert.match(await value(page, 'Location'), /ok/);
    // Crossing north must turn the dial the short way, not spin it almost a full turn.
    await slider(page, 'alpha', 2);
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('358°'));
    const before = Number(await page.locator('#rose').getAttribute('data-angle'));
    await slider(page, 'alpha', 358);
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('2°'));
    const after = Number(await page.locator('#rose').getAttribute('data-angle'));
    assert.ok(Math.abs(after - before) < 10, `dial turned ${after - before}° instead of 4°`);
    await slider(page, 'beta', 88);
    await page.getByText('Hold the phone flatter.').waitFor();
    await page.screenshot({ path: join(shots, 'bar-flatter.png') });
    await page.context().close();
  });

  await check('aim mode with up/down reports pitch', async () => {
    const page = await open('mode=aim-pitch&sim=1&theme=dark&north=magnetic');
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await slider(page, 'beta', 120);
    await page.waitForFunction(() => document.querySelector('dd[data-key="Up/down"]')?.textContent === '30°');
    assert.match(await value(page, 'Heading'), /^0°/);
    await page.screenshot({ path: join(shots, 'aim-dark.png') });
    await page.context().close();
  });

  await check('denied GPS shows Android steps and retry', async () => {
    const page = await open('mode=map&sim=1&theme=terminal&north=magnetic');
    await page.evaluate(() => { window.geoKitSim.denyGps = true; });
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await page.getByRole('heading', { name: 'Location is blocked' }).waitFor();
    await page.getByText('Motion sensors').count(); // not shown here
    await page.getByText('Location → Allow').first().waitFor();
    const bg = await page.locator('.gk-card').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(bg, 'rgb(3, 10, 3)', 'terminal theme applied');
    await page.screenshot({ path: join(shots, 'denied-terminal.png') });
    await page.evaluate(() => { window.geoKitSim.denyGps = false; });
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.locator('.gk-overlay').waitFor({ state: 'detached' });
    await page.context().close();
  });

  await check('compass stopping gives a stale bar; no data at all gives a dismissible screen', async () => {
    const page = await open('mode=aim&sim=1&lang=sv&theme=parchment&north=magnetic');
    await page.getByRole('heading', { name: 'Innan du börjar' }).waitFor();
    await page.screenshot({ path: join(shots, 'intro-parchment-sv.png') });
    await page.getByRole('button', { name: 'Tillåt och starta' }).click();
    await slider(page, 'beta', 90);
    await page.waitForFunction(() => document.querySelector('dd[data-key="Compass"]')?.textContent === 'ok');
    await page.evaluate(() => { window.geoKitSim.compassOn = false; });
    await page.getByText('Kompassen pausad').waitFor({ timeout: 6000 });
    await page.context().close();

    const silent = await open('mode=aim&sim=1&lang=sv&north=magnetic');
    await silent.evaluate(() => { window.geoKitSim.compassOn = false; });
    await silent.getByRole('button', { name: 'Tillåt och starta' }).click();
    await silent.getByRole('heading', { name: 'Ingen kompassignal' }).waitFor({ timeout: 12000 });
    await silent.screenshot({ path: join(shots, 'missing-sv.png') });
    await silent.getByRole('button', { name: 'Spela utan kompass' }).click();
    await silent.getByText('Spelar utan kompass.').waitFor();
    await silent.context().close();
  });

  await check('required compass cannot be skipped', async () => {
    const page = await open('mode=aim&sim=1&require=1&north=magnetic');
    await page.evaluate(() => { window.geoKitSim.compassOn = false; });
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await page.getByRole('heading', { name: 'No compass signal' }).waitFor({ timeout: 12000 });
    assert.equal(await page.getByRole('button', { name: 'Play without compass' }).count(), 0);
    await page.context().close();
  });

  await check('calibration screen and north alignment', async () => {
    const page = await open('mode=map&sim=1&north=magnetic');
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await slider(page, 'alpha', 40);
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('320°'));
    await page.getByRole('button', { name: 'Calibrate screen' }).click();
    await page.getByRole('heading', { name: 'Calibrate the compass' }).waitFor();
    await page.screenshot({ path: join(shots, 'calibrate.png') });
    await page.getByRole('button', { name: 'This is north' }).click();
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('0°'));
    await page.getByRole('button', { name: 'Reset north alignment' }).click();
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('320°'));
    await page.context().close();
  });

  await check('target test: arrival needs several fixes', async () => {
    const page = await open('mode=map&sim=1&north=magnetic');
    await page.evaluate(() => localStorage.removeItem('geo-kit-demo-target'));
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await page.locator('.gk-overlay').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Target 40 m ahead' }).click();
    await page.waitForFunction(() => /^4\d m/.test(document.querySelector('dd[data-key="Target"]')?.textContent ?? ''));
    assert.equal(await value(page, 'At target'), 'no');
    await slider(page, 'north', 38);
    await page.waitForFunction(() => document.querySelector('dd[data-key="At target"]')?.textContent === 'yes', null, { timeout: 8000 });
    await page.context().close();
  });

  await check('true north: compass heading corrected with the World Magnetic Model', async () => {
    const page = await open('mode=map&sim=1');
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await page.locator('.gk-overlay').waitFor({ state: 'detached' });
    // Uppsala: magnetic north is about 7.7° east of true north (WMM2025, late 2026).
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('8°'));
    assert.match(await value(page, 'North'), /^true \(declination \+7\.\d°\)$/);
    await slider(page, 'alpha', 40);
    await page.waitForFunction(() => document.querySelector('dd[data-key="Heading"]')?.textContent?.startsWith('328°'));
    await page.waitForTimeout(1000); // let the smoothing settle, as a player holding still would
    await page.getByRole('button', { name: 'Calibrate screen' }).click();
    await page.getByRole('button', { name: 'This is north' }).click();
    await page.waitForTimeout(600);
    const aligned = parseFloat(await value(page, 'Heading'));
    assert.ok(aligned <= 1 || aligned >= 359, `after aligning to true north the heading was ${aligned}°`);
    await page.context().close();
  });

  await check('report: session trace, stream offset for diagnostics only, no coordinates', async () => {
    const page = await open('mode=aim-pitch&sim=1&north=magnetic');
    await page.getByRole('button', { name: 'Allow and start' }).click();
    await slider(page, 'beta', 90);
    const lastRow = (name, expected) => page.waitForFunction(([column, wanted]) => {
      const { trace } = window.geoKit.exportReport();
      const row = trace.rows.at(-1);
      return trace.rows.length >= 3 && row && row[trace.columns.indexOf(column)] === wanted
        && row[trace.columns.indexOf('compass')] === 'ok';
    }, [name, expected], { timeout: 10000 });
    await lastRow('relOffset', 50);
    assert.match(await value(page, 'Heading'), /^0°/);
    // The relative stream drifts 43° away: recorded, but the heading must not move.
    await slider(page, 'relOffset', 93);
    await lastRow('relOffset', 93);
    assert.match(await value(page, 'Heading'), /^0°/);
    assert.equal(await value(page, 'Stream offset'), '93°');
    const report = await page.evaluate(() => window.geoKit.exportReport());
    assert.equal(report.reportVersion, 2);
    assert.equal(report.diagnostics.offset, 93);
    assert.ok(report.transitions.some(t => t.what === 'compass' && t.to === 'ok'), 'compass start is in the transitions');
    assert.ok(report.transitions.some(t => t.what === 'location' && t.to === 'ok'), 'GPS start is in the transitions');
    assert.ok(report.samples.some(sample => sample.relOffset === 93), 'dense samples carry the offset');
    const headingColumn = report.trace.columns.indexOf('heading');
    assert.ok(report.trace.rows.slice(-2).every(row => row[headingColumn] === 0), 'trace shows the unchanged heading');
    const text = JSON.stringify(report);
    assert.ok(!text.includes('59.85') && !text.includes('17.63'), 'no coordinates in the report');
    await page.context().close();
  });

  await check('desktop visitors are asked to use a phone', async () => {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const page = await context.newPage();
    await page.goto(base + '?mode=map');
    await page.getByRole('heading', { name: 'Use your phone' }).waitFor();
    await page.getByRole('button', { name: 'Continue anyway' }).click();
    await page.getByRole('heading', { name: 'Before you start' }).waitFor();
    await context.close();
  });

  await check('computers without GPS: warn, block and allow', async () => {
    const desktopPage = async query => {
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(`${query}: ${e.message}`));
      await page.goto(base + '?' + query);
      await slider(page, 'accuracy', 900);
      return page;
    };
    const warn = await desktopPage('mode=none&sim=1&nogps=warn');
    await warn.getByRole('button', { name: 'Continue anyway' }).click();
    await warn.getByRole('button', { name: 'Allow and start' }).click();
    await warn.getByRole('heading', { name: 'This device has no GPS' }).waitFor();
    await warn.screenshot({ path: join(shots, 'no-gps-warn.png') });
    await warn.getByRole('button', { name: 'Continue anyway' }).click();
    await warn.getByText('Rough position only (±900 m)').waitFor();
    await warn.context().close();

    const blocked = await desktopPage('mode=none&sim=1&nogps=block');
    await blocked.getByRole('heading', { name: 'Use your phone' }).waitFor();
    assert.equal(await blocked.getByRole('button', { name: 'Continue anyway' }).count(), 0);
    await blocked.context().close();

    const allowed = await desktopPage('mode=map&sim=1&nogps=allow');
    await allowed.getByRole('button', { name: 'Allow and start' }).click();
    await allowed.getByText('Rough position only (±900 m)').waitFor();
    await allowed.context().close();
  });

  assert.deepEqual(errors, [], 'no console errors');
  console.log(`\n${passed} browser checks passed`);
} finally {
  await browser.close();
  server.close();
}
