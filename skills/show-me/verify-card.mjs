#!/usr/bin/env node
// Load a card under a strict sandbox and CSP at the three frame sizes.
// Usage: verify-card.mjs card.html [--shots dir]
// Needs Playwright: npm i -D playwright && npx playwright install chromium
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const MAX_CARD_BYTES = 4 * 1024 * 1024;
const SIZES = [[340, 300], [760, 460], [1280, 800]];
const MIN_TARGET = 44;
const CSP = "sandbox allow-scripts allow-popups allow-downloads; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; img-src data: blob:; media-src data: blob:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'";

const [path, flag, shotArg] = process.argv.slice(2);
if (!path || (flag && flag !== '--shots')) { console.error('usage: verify-card.mjs <card.html> [--shots dir]'); process.exit(2); }
const card = resolve(path);
const shots = shotArg || join(tmpdir(), 'show-me-verify', basename(card, '.html'));
mkdirSync(shots, { recursive: true });
const html = readFileSync(card);
const problems = [];
if (statSync(card).size > MAX_CARD_BYTES) problems.push('larger than 4 MiB');

// Chromium refuses its own sandbox when it runs as root, which is common in containers.
const launch = { headless: true, args: process.getuid?.() === 0 ? ['--no-sandbox', '--disable-dev-shm-usage'] : [] };
const browser = await chromium.launch(launch).catch(() => chromium.launch({ ...launch, channel: 'chrome' }));
try {
  for (const [width, height] of SIZES) {
    const page = await browser.newPage({ viewport: { width, height } });
    const note = text => problems.push(`${width}x${height}: ${text}`);
    page.on('pageerror', error => note(error.message));
    page.on('console', message => { if (message.type() === 'error') note(message.text()); });
    await page.route('https://card.test/', route => route.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': CSP }, body: html }));
    await page.goto('https://card.test/', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const state = await page.evaluate(minTarget => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      tall: [...document.body.children].filter(item => !['SCRIPT', 'STYLE'].includes(item.tagName))
        .filter(item => item.scrollHeight > item.clientHeight + 1 || item.getBoundingClientRect().bottom > innerHeight + 1)
        .map(item => item.tagName.toLowerCase()),
      broken: [...document.images].filter(image => image.complete && !image.naturalWidth).length,
      small: [...document.querySelectorAll('button, a[href], [role="button"]')]
        .filter(item => { const box = item.getBoundingClientRect(); return box.width && box.height && Math.min(box.width, box.height) < minTarget; })
        .map(item => item.textContent.trim() || item.tagName),
    }), MIN_TARGET);
    if (state.overflow) note('sideways overflow');
    if (state.tall.length) note(`taller than the frame: ${state.tall.join(', ')}`);
    if (state.broken) note(`${state.broken} broken image(s)`);
    if (state.small.length) note(`targets under ${MIN_TARGET}px: ${state.small.join(', ')}`);
    await page.screenshot({ path: `${shots}/${width}x${height}.png` });
    await page.close();
  }
} finally { await browser.close(); }
if (problems.length) { console.error(`FAIL ${basename(card)}\n${problems.map(item => `- ${item}`).join('\n')}`); process.exit(1); }
console.log(`PASS ${basename(card)}: ${SIZES.map(size => size.join('x')).join(', ')}; screenshots in ${shots}`);
