#!/usr/bin/env node
// Build a flipbook: a scrubber over real screenshots. Motion over time without a video pipeline.
// Usage: flipbook-card.mjs --frame "Label=shot1.png" --frame "Label=shot2.png" ... --title "What moves"
//   [--note "Real screenshots"] [--action "Reply text" --action-label "Button text"] [--fps 2] --out card.html
// Plays once when seen, then stops on the last frame. Drag the scrubber, press ←/→, or tap the stage to step.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const MAX_CARD_BYTES = 4 * 1024 * 1024;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,179}\.html$/;
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

const fail = message => { console.error(`flipbook-card: ${message}`); process.exit(1); };
const escapeHtml = text => String(text).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

function imageUri(path) {
  const ext = path.toLowerCase().split('.').pop();
  if (!MIME[ext]) fail(`${path}: use PNG, JPEG or WebP`);
  return `data:${MIME[ext]};base64,${readFileSync(path).toString('base64')}`;
}

export function flipbookCard({ frames, title, note, action, actionLabel, fps }) {
  const data = frames.map(f => ({ label: f.label, src: imageUri(f.path) }));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: dark; --accent: #a7ddeb; --text: #edf2f7; --muted: #94a3b2; --edge: #303c49; --panel: #151b23; }
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 8px; padding: 10px; background: transparent; color: var(--text); font: 14px/1.35 system-ui, sans-serif; overflow: hidden; }
header { display: flex; align-items: baseline; gap: 12px; min-width: 0; min-height: 28px; padding-right: 48px; }
h1 { overflow: hidden; margin: 0; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
header span { flex: none; color: var(--muted); font-size: 12px; }
.stage { position: relative; min-height: 0; overflow: hidden; border-radius: 10px; background: transparent; cursor: pointer; }
.stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity .12s; }
.stage img[data-on] { opacity: 1; }
.caption { position: absolute; left: 10px; bottom: 10px; max-width: calc(100% - 20px); padding: 4px 10px; border-radius: 999px; background: rgba(12, 16, 21, .82); color: var(--text); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.caption b { color: var(--accent); font-weight: 600; margin-right: 6px; }
footer { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 8px; align-items: center; }
button { min-height: 44px; min-width: 44px; border: 1px solid var(--edge); border-radius: 8px; background: var(--panel); color: var(--text); font: 600 14px system-ui, sans-serif; cursor: pointer; }
button.primary { border-color: var(--accent); background: var(--accent); color: #0c1015; padding: 0 14px; }
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.scrub { display: flex; align-items: center; min-height: 44px; min-width: 0; }
input[type=range] { width: 100%; height: 44px; margin: 0; accent-color: var(--accent); cursor: pointer; }
@media (max-width: 420px) { button.primary span { display: none; } button.primary { padding: 0 10px; } }
@media (prefers-reduced-motion: reduce) { .stage img { transition: none; } }
</style>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1>${note ? `<span>${escapeHtml(note)}</span>` : ''}</header>
<div class="stage" id="stage" aria-live="off">
${data.map((f, i) => `<img src="${f.src}" alt="${escapeHtml(f.label)}"${i === 0 ? ' data-on' : ''}>`).join('\n')}
<div class="caption" id="cap"></div>
</div>
<footer>
<button id="play" aria-label="Replay" title="Replay">↻</button>
<div class="scrub"><input id="range" type="range" min="0" max="${data.length - 1}" value="0" step="1" aria-label="Frame"></div>
${action ? `<button class="primary" id="act">${escapeHtml(actionLabel || action)}</button>` : ''}
</footer>
<script>
const labels = ${JSON.stringify(data.map(f => f.label))};
const imgs = [...document.querySelectorAll('.stage img')];
const range = document.getElementById('range'), cap = document.getElementById('cap'), play = document.getElementById('play');
const fps = ${Number(fps) || 2}; let i = 0, timer = 0;
function show(n) { i = Math.max(0, Math.min(imgs.length - 1, n)); imgs.forEach((im, k) => k === i ? im.setAttribute('data-on', '') : im.removeAttribute('data-on')); range.value = i; cap.innerHTML = '<b>' + (i + 1) + '/' + imgs.length + '</b>' + labels[i].replace(/[&<>]/g, c => '&#' + c.charCodeAt(0) + ';'); }
function stop() { clearInterval(timer); timer = 0; }
function run() { stop(); show(0); timer = setInterval(() => { if (i >= imgs.length - 1) return stop(); show(i + 1); }, 1000 / fps); }
range.addEventListener('input', () => { stop(); show(+range.value); });
document.getElementById('stage').addEventListener('click', () => { stop(); show((i + 1) % imgs.length); });
play.addEventListener('click', run);
document.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { stop(); show(i + 1); } if (e.key === 'ArrowLeft') { stop(); show(i - 1); } });
${action ? `document.getElementById('act').addEventListener('click', () => parent.postMessage({ type: 'x-card-reply', text: ${JSON.stringify(action)} }, '*'));` : ''}
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) show(imgs.length - 1); else { show(0); const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); } }); io.observe(document.body); }
</script>
</body>
</html>
`;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { values } = parseArgs({ options: {
    frame: { type: 'string', multiple: true }, title: { type: 'string' }, note: { type: 'string' },
    action: { type: 'string' }, 'action-label': { type: 'string' }, fps: { type: 'string' }, out: { type: 'string' },
  } });
  if (!values.frame || values.frame.length < 2) fail('--frame "Label=file.png" is required, at least twice');
  if (!values.title) fail('--title is required');
  if (!values.out) fail('--out is required');
  const name = values.out.split('/').pop();
  if (!NAME.test(name)) fail(`${name}: use letters, digits, . _ - and end with .html`);
  const frames = values.frame.map(f => { const at = f.indexOf('='); if (at < 1) fail(`--frame needs Label=path: ${f}`); return { label: f.slice(0, at), path: f.slice(at + 1) }; });
  const html = flipbookCard({ frames, title: values.title, note: values.note, action: values.action, actionLabel: values['action-label'], fps: values.fps });
  if (Buffer.byteLength(html) > MAX_CARD_BYTES) fail(`card is ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MiB; use fewer or smaller frames (JPEG/WebP)`);
  writeFileSync(values.out, html);
  console.log(`${values.out}: ${frames.length} frames, ${(Buffer.byteLength(html) / 1024).toFixed(0)} KiB`);
}
