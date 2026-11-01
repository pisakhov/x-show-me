// Proves the cards work the way the README says. Run with: npm test
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { card, EXAMPLES, launch, ROOT, serve } from './lib.mjs';

const VERIFY = join(ROOT, 'skills/show-me/verify-card.mjs');
const SHOW = join(ROOT, 'skills/show-me/show-card.mjs');
const results = [];
const test = async (name, run) => { await run(); results.push(name); console.log(`ok - ${name}`); };
const verify = path => spawnSync('node', [VERIFY, path, '--shots', mkdtempSync(join(tmpdir(), 'show-me-'))], { encoding: 'utf8' });

const site = await serve();
const browser = await launch();
// A tap arrives as a message, so wait for it instead of reading straight away.
const drafted = (page, want) => page.waitForFunction(({ source, flags }) => new RegExp(source, flags).test(document.getElementById('draft-text').textContent), { source: want.source, flags: want.flags }, { timeout: 3000 });
const exactly = text => new RegExp(`^${text.replaceAll('.', '\\.')}$`);
const open = async (options = {}) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  const outside = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(site.url) && !request.url().startsWith('data:')) outside.push(request.url()); });
  await page.goto(site.url);
  return { page, errors, outside, close: () => context.close() };
};

try {
  for (const name of EXAMPLES) {
    await test(`${name} passes the card verifier`, () => {
      const run = verify(join(ROOT, 'examples', `${name}.html`));
      assert.equal(run.status, 0, run.stderr);
    });
  }

  await test('the verifier rejects a card that is taller than its frame', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'show-me-')), 'tall.html');
    writeFileSync(path, '<!doctype html><title>Tall</title><style>html,body{height:100%;margin:0}main{height:100%}div{height:900px}</style><main><div>Too tall</div></main>');
    const run = verify(path);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /taller than the frame/);
  });

  await test('point at it: a tap names the spot and the human confirms', async () => {
    const { page, errors, outside, close } = await open();
    const frame = await card(page, 'point-at-it');
    await assert.rejects(frame.getByRole('button', { name: 'Fix this' }).click({ timeout: 300 }));
    await frame.getByRole('button', { name: /We use cookies/ }).click();
    await frame.locator('.pin').waitFor();
    await frame.getByRole('button', { name: 'Fix this' }).click();
    await drafted(page, /^Fix this: Cookie bar/);
    assert.deepEqual([errors, outside], [[], []]);
    await close();
  });

  await test('point at it works from the keyboard', async () => {
    const { page, close } = await open();
    const frame = await card(page, 'point-at-it');
    await frame.getByRole('button', { name: 'Pay $28.00' }).focus();
    await page.keyboard.press('Enter');
    await frame.getByRole('button', { name: 'Fix this' }).focus();
    await page.keyboard.press('Enter');
    await drafted(page, /^Fix this: Pay button/);
    await close();
  });

  await test('tap-through map: the broken step opens first and each step explains itself', async () => {
    const { page, close } = await open();
    const frame = await card(page, 'tap-through-map');
    assert.equal(await frame.locator('#name').textContent(), 'Payment');
    await frame.getByRole('button', { name: 'Cart: ok' }).click();
    assert.equal(await frame.locator('#name').textContent(), 'Cart');
    await frame.getByRole('button', { name: 'Payment: broken' }).click();
    await frame.getByRole('button', { name: 'Fix this step' }).click();
    await drafted(page, exactly('Fix the Payment step.'));
    await close();
  });

  await test('tap to decide: one tap answers and a new tap changes the answer', async () => {
    const { page, close } = await open();
    const frame = await card(page, 'tap-to-decide');
    await frame.getByRole('button', { name: /Cookie pop-up/ }).click();
    await drafted(page, exactly('Go with: Cookie pop-up.'));
    await frame.getByRole('button', { name: /Sticky Pay button/ }).click();
    await drafted(page, exactly('Go with: Sticky Pay button.'));
    await close();
  });

  await test('work board: only reached stages count and the failure shows', async () => {
    const { page, close } = await open();
    const frame = await card(page, 'work-board');
    assert.equal(await frame.locator('.stage[data-state="waiting"]').count(), 4);
    await frame.locator('.stage[data-state="failed"]').waitFor({ timeout: 15000 });
    await frame.getByText('Done. The Pay button works on phones.').waitFor({ timeout: 15000 });
    assert.deepEqual(await frame.locator('.stage small').allTextContents(), ['5', '3', '2', '2', '1']);
    assert.equal(await frame.locator('#count').textContent(), '13 steps');
    await frame.getByText('See every step').click();
    assert.equal(await frame.locator('li[data-failed]').count(), 1);
    await frame.getByRole('button', { name: 'Show the result' }).click();
    await drafted(page, exactly('Show me the result.'));
    await close();
  });

  await test('work board: reduced motion goes straight to the end', async () => {
    const { page, close } = await open({ reducedMotion: 'reduce' });
    const frame = await card(page, 'work-board');
    await frame.getByText('Done. The Pay button works on phones.').waitFor({ timeout: 2000 });
    await close();
  });

  await test('drag to compare: dragging and arrow keys move the line', async () => {
    const { page, close } = await open({ reducedMotion: 'reduce' });
    const frame = await card(page, 'drag-to-compare');
    const stage = frame.locator('#stage');
    const line = () => frame.locator('html').evaluate(root => parseInt(root.style.getPropertyValue('--x'), 10));
    const box = await stage.boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const dragged = await line();
    assert.ok(Math.abs(dragged - 20) <= 1, `line at ${dragged}`);
    await page.keyboard.press('ArrowRight');
    assert.equal(await line(), dragged + 1);
    await frame.getByRole('button', { name: 'Ship it' }).click();
    await drafted(page, exactly('Ship it.'));
    await close();
  });

  await test('a card cannot talk to the page unless it is one of the frames', async () => {
    const { page, close } = await open();
    await page.evaluate(() => postMessage({ type: 'x-card-reply', text: 'forged' }, '*'));
    await page.waitForTimeout(100);
    assert.notEqual(await page.locator('#draft-text').textContent(), 'forged');
    await close();
  });

  await test('phone: one side at a time, and the switch flips it', async () => {
    const { page, close } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const chat = page.locator('#tap-to-decide .side.chat');
    const show = page.locator('#tap-to-decide .side.show');
    assert.deepEqual([await chat.isVisible(), await show.isVisible()], [false, true]);
    await page.getByRole('button', { name: 'Chatbot' }).tap();
    assert.deepEqual([await chat.isVisible(), await show.isVisible()], [true, false]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await close();
  });

  await test('show-card: a tap fills the draft, and only Send reaches the agent', async () => {
    const child = spawn('node', [SHOW, join(ROOT, 'examples/tap-to-decide.html'), '--no-open']);
    let stdout = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    const url = await new Promise(resolve => child.stderr.on('data', chunk => resolve(String(chunk).match(/http\S+/)[0])));
    const exited = new Promise(resolve => child.on('exit', resolve));
    const page = await browser.newPage();
    await page.goto(url);
    await page.frameLocator('iframe').getByRole('button', { name: /Sticky Pay button/ }).click();
    await page.waitForFunction(() => document.getElementById('draft').value === 'Go with: Sticky Pay button.');
    assert.equal(stdout, '', 'a tap must never send');
    await page.getByRole('button', { name: 'Send' }).click();
    assert.equal(await exited, 0);
    assert.equal(stdout, 'Go with: Sticky Pay button.\n');
    await page.close();
  });

  await test('show-card refuses a wrong token', async () => {
    const child = spawn('node', [SHOW, join(ROOT, 'examples/tap-to-decide.html'), '--no-open']);
    const url = await new Promise(resolve => child.stderr.on('data', chunk => resolve(String(chunk).match(/http\S+/)[0])));
    const { origin } = new URL(url);
    assert.equal((await fetch(`${origin}/wrong/card`)).status, 404);
    assert.equal((await fetch(`${origin}/wrong/reply`, { method: 'POST', body: 'x' })).status, 404);
    child.kill();
  });
} finally {
  await browser.close();
  site.close();
}
console.log(`\n${results.length} passed`);
