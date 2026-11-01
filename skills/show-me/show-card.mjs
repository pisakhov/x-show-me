#!/usr/bin/env node
// A tiny host for agents that live in a terminal. It shows one card in a sandboxed
// frame on this machine, waits for the human, then prints their reply to stdout.
// Usage: show-card.mjs card.html [--timeout 600] [--no-open]
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { parseArgs } from 'node:util';

const MAX_REPLY = 2000;
const CSP = "sandbox allow-scripts allow-popups allow-downloads; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; img-src data: blob:; media-src data: blob:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'";

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  timeout: { type: 'string', default: '600' }, 'no-open': { type: 'boolean', default: false },
} });
const [path] = positionals;
if (!path) { console.error('usage: show-card.mjs <card.html> [--timeout seconds] [--no-open]'); process.exit(2); }
const card = readFileSync(path);
const token = randomBytes(16).toString('hex');

const page = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Show Me</title>
<style>
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { display: flex; flex-direction: column; background: #0c1015; color: #edf2f7; font: 16px/1.4 ui-sans-serif, system-ui, sans-serif; }
iframe { flex: 1; width: 100%; min-height: 0; border: 0; }
form { display: flex; gap: 8px; padding: 8px; border-top: 1px solid #303c49; background: #1b242e; }
textarea { flex: 1; min-width: 0; height: 44px; padding: 10px; resize: none; border: 1px solid #303c49; border-radius: 8px; background: #0c1015; color: inherit; font: inherit; }
button { min-width: 88px; min-height: 44px; border: 0; border-radius: 8px; background: #a7ddeb; color: #0c1015; font: 600 16px ui-sans-serif, system-ui, sans-serif; cursor: pointer; }
</style></head>
<body>
<iframe id="card" title="Card" src="/${token}/card" sandbox="allow-scripts allow-popups allow-downloads"></iframe>
<form id="form"><textarea id="draft" maxlength="${MAX_REPLY}" aria-label="Your reply" placeholder="Tap the card or type"></textarea><button>Send</button></form>
<script>
const draft = document.getElementById('draft');
const frame = document.getElementById('card');
addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.data?.type !== 'x-card-reply' || typeof event.data.text !== 'string') return;
  draft.value = (draft.value ? draft.value + '\\n' : '') + event.data.text;
  draft.value = draft.value.slice(0, ${MAX_REPLY});
  draft.focus();
});
document.getElementById('form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!draft.value.trim()) return draft.focus();
  await fetch('/${token}/reply', { method: 'POST', body: draft.value });
  document.body.textContent = 'Sent. You can close this tab.';
});
</script>
</body>
</html>`;

const server = createServer((request, response) => {
  const send = (status, headers, body) => { response.writeHead(status, { 'Cache-Control': 'no-store', ...headers }); response.end(body); };
  if (request.method === 'GET' && request.url === `/${token}`) return send(200, { 'Content-Type': 'text/html; charset=utf-8' }, page);
  if (request.method === 'GET' && request.url === `/${token}/card`) return send(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP }, card);
  if (request.method === 'POST' && request.url === `/${token}/reply`) {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { if (body.length <= MAX_REPLY) body += chunk; });
    request.on('end', () => {
      send(204, {});
      process.stdout.write(`${body.slice(0, MAX_REPLY)}\n`, () => process.exit(0));
    });
    return;
  }
  send(404, {}, '');
});

setTimeout(() => { console.error('show-card: no reply before the timeout'); process.exit(3); }, Number(values.timeout) * 1000).unref();
server.listen(0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/${token}`;
  console.error(`Open ${url}`);
  if (values['no-open']) return;
  const [command, args] = { darwin: ['open', [url]], win32: ['cmd', ['/c', 'start', '', url]] }[process.platform] || ['xdg-open', [url]];
  spawn(command, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
});
