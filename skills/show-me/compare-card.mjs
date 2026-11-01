#!/usr/bin/env node
// Build a before/after slider card from two images.
// Usage: compare-card.mjs --before a.png --after b.png --title "Composer" --out card.html
//   [--before-label Before] [--after-label After] [--keep "Keep this"] [--back "Go back"]
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';

const MAX_CARD_BYTES = 4 * 1024 * 1024;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,179}\.html$/;
const IMAGE_TYPES = [
  ['image/png', bytes => bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))],
  ['image/jpeg', bytes => bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))],
  ['image/webp', bytes => bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP'],
];

const fail = message => { console.error(`compare-card: ${message}`); process.exit(1); };
const escapeHtml = text => String(text).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

function imageUri(path) {
  const bytes = readFileSync(path);
  const type = IMAGE_TYPES.find(([, matches]) => matches(bytes))?.[0];
  if (!type) fail(`${path} is not a PNG, JPEG or WebP image`);
  return `data:${type};base64,${bytes.toString('base64')}`;
}

export function compareCard({ before, after, title, beforeLabel, afterLabel, keep, back }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { --x: 50%; --accent: #a8dcee; --text: #eef2f7; --muted: #9aa7b6; --edge: #33404f; --panel: #1c232d; --base: #12171e; }
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 8px; padding: 10px; background: var(--base); color: var(--text); font: 14px/1.35 system-ui, sans-serif; overflow: hidden; }
header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
h1 { overflow: hidden; margin: 0; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
header span { flex: none; color: var(--muted); font-size: 12px; }
.stage { position: relative; min-height: 0; overflow: hidden; border: 1px solid var(--edge); border-radius: 8px; background: var(--panel); cursor: ew-resize; touch-action: none; user-select: none; -webkit-user-select: none; }
.stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.after { position: absolute; inset: 0; background: var(--panel); clip-path: inset(0 0 0 var(--x)); }
.line { position: absolute; top: 0; bottom: 0; left: var(--x); width: 2px; margin-left: -1px; background: var(--accent); pointer-events: none; }
.line::after { content: ''; position: absolute; bottom: 8px; left: 50%; width: 36px; height: 24px; margin-left: -18px; border: 2px solid var(--accent); border-radius: 12px; background: var(--base) linear-gradient(90deg, transparent 47%, var(--accent) 47% 53%, transparent 53%); }
.stage:has(input:focus-visible) .line::after { outline: 2px solid var(--text); outline-offset: 2px; }
.tag { position: absolute; top: 8px; padding: 2px 8px; border-radius: 6px; background: rgba(18, 23, 30, .82); font-size: 12px; pointer-events: none; }
.tag.left { left: 8px; }
.tag.right { right: 8px; }
.range { position: absolute; width: 1px; height: 1px; opacity: 0; }
footer { display: flex; gap: 8px; }
button { flex: 1; min-height: 44px; border: 1px solid var(--edge); border-radius: 8px; background: var(--panel); color: var(--text); font: 600 14px system-ui, sans-serif; cursor: pointer; }
button.primary { border-color: var(--accent); background: var(--accent); color: var(--base); }
button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
</style>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1><span>Drag to compare</span></header>
<div class="stage" id="stage">
  <img src="${before}" alt="${escapeHtml(beforeLabel)}">
  <div class="after"><img src="${after}" alt="${escapeHtml(afterLabel)}"></div>
  <span class="tag left">${escapeHtml(beforeLabel)}</span>
  <span class="tag right">${escapeHtml(afterLabel)}</span>
  <div class="line"></div>
  <input class="range" id="range" type="range" min="0" max="100" value="50" aria-label="Compare ${escapeHtml(beforeLabel)} and ${escapeHtml(afterLabel)}">
</div>
<footer>
  <button id="back" type="button">${escapeHtml(back)}</button>
  <button id="keep" class="primary" type="button">${escapeHtml(keep)}</button>
</footer>
<script>
const stage = document.getElementById('stage');
const range = document.getElementById('range');
const show = value => { range.value = value; document.documentElement.style.setProperty('--x', value + '%'); };
const follow = event => { const box = stage.getBoundingClientRect(); show(Math.round(Math.min(100, Math.max(0, (event.clientX - box.left) / box.width * 100)))); };
range.addEventListener('input', () => show(range.value));
stage.addEventListener('pointerdown', event => { stage.setPointerCapture(event.pointerId); follow(event); range.focus({ preventScroll: true }); });
// Without this the browser moves focus away right after pointerdown and the arrow keys stop working.
stage.addEventListener('mousedown', event => event.preventDefault());
stage.addEventListener('pointermove', event => { if (stage.hasPointerCapture(event.pointerId)) follow(event); });
const reply = text => parent.postMessage({ type: 'x-card-reply', text }, '*');
for (const button of document.querySelectorAll('footer button')) button.addEventListener('click', () => reply(button.textContent));
</script>
</body>
</html>
`;
}

const { values } = parseArgs({ options: {
  before: { type: 'string' }, after: { type: 'string' }, title: { type: 'string' }, out: { type: 'string' },
  'before-label': { type: 'string', default: 'Before' }, 'after-label': { type: 'string', default: 'After' },
  keep: { type: 'string', default: 'Keep this' }, back: { type: 'string', default: 'Go back' },
} });
for (const required of ['before', 'after', 'title', 'out']) if (!values[required]) fail(`--${required} is required`);
if (!NAME.test(basename(values.out))) fail(`${basename(values.out)} is not a valid card name`);
const html = compareCard({
  before: imageUri(values.before), after: imageUri(values.after), title: values.title,
  beforeLabel: values['before-label'], afterLabel: values['after-label'], keep: values.keep, back: values.back,
});
const bytes = Buffer.byteLength(html);
if (bytes > MAX_CARD_BYTES) fail(`card is ${(bytes / 1048576).toFixed(1)} MiB, the limit is 4 MiB; resize the images`);
writeFileSync(values.out, html);
console.log(`${values.out} (${(bytes / 1024).toFixed(0)} KiB)`);
