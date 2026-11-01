// Shared by the tests and the screenshot script.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const EXAMPLES = ['point-at-it', 'tap-through-map', 'tap-to-decide', 'work-board', 'drag-to-compare'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif' };

export function launch() {
  const options = { headless: true, args: process.getuid?.() === 0 ? ['--no-sandbox', '--disable-dev-shm-usage'] : [] };
  return chromium.launch(options).catch(() => chromium.launch({ ...options, channel: 'chrome' }));
}

export function serve() {
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://x').pathname));
    try {
      const body = readFileSync(join(ROOT, path === '/' ? 'index.html' : path));
      response.writeHead(200, { 'Content-Type': TYPES[extname(path) || '.html'] || 'application/octet-stream' });
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() })));
}

// A card inside the gallery, scrolled into view so its lazy frame loads.
export async function card(page, id) {
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  return page.frameLocator(`#${id} iframe`);
}
