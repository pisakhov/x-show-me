#!/usr/bin/env node
// Build a card that plays a short clip once, then stops on the outcome.
// Usage: video-card.mjs --video clip.mp4 --title "Pay fix" --note "Reenactment" --alt "What happens" --out card.html
//   [--action "Looks right"]
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';

const MAX_CARD_BYTES = 4 * 1024 * 1024;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,179}\.html$/;

const fail = message => { console.error(`video-card: ${message}`); process.exit(1); };
const escapeHtml = text => String(text).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

function videoUri(path) {
  const bytes = readFileSync(path);
  if (bytes.subarray(4, 8).toString('latin1') !== 'ftyp') fail(`${path} is not an MP4`);
  return `data:video/mp4;base64,${bytes.toString('base64')}`;
}

export function videoCard({ video, title, note, alt, action }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { --accent: #a7ddeb; --text: #edf2f7; --muted: #94a3b2; --edge: #303c49; --panel: #151b23; --base: #0c1015; }
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 8px; padding: 10px; background: var(--base); color: var(--text); font: 14px/1.35 system-ui, sans-serif; overflow: hidden; }
header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
h1 { overflow: hidden; margin: 0; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
header span { flex: none; color: var(--muted); font-size: 12px; }
.stage { min-height: 0; overflow: hidden; border: 1px solid var(--edge); border-radius: 8px; background: var(--base); }
video { display: block; width: 100%; height: 100%; object-fit: contain; }
footer { display: flex; gap: 8px; }
button { flex: 1; min-height: 44px; border: 1px solid var(--edge); border-radius: 8px; background: var(--panel); color: var(--text); font: 600 14px system-ui, sans-serif; cursor: pointer; }
button.primary { border-color: var(--accent); background: var(--accent); color: var(--base); }
button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
</style>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1><span>${escapeHtml(note)}</span></header>
<div class="stage"><video id="clip" src="${video}" aria-label="${escapeHtml(alt)}" muted playsinline preload="auto"></video></div>
<footer>
  <button id="replay" type="button">Replay</button>
  <button id="action" class="primary" type="button">${escapeHtml(action)}</button>
</footer>
<script>
// No loop: a clip plays once when it comes into view, then stops on the outcome.
const clip = document.getElementById('clip');
const play = () => { clip.currentTime = 0; clip.play().catch(() => {}); };
const jumpToEnd = () => { clip.currentTime = clip.duration; };
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  if (clip.readyState > 0) jumpToEnd(); else clip.addEventListener('loadedmetadata', jumpToEnd, { once: true });
} else {
  new IntersectionObserver((entries, watcher) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    watcher.disconnect();
    play();
  }, { threshold: .5 }).observe(clip);
}
document.getElementById('replay').addEventListener('click', play);
const action = document.getElementById('action');
action.addEventListener('click', () => parent.postMessage({ type: 'x-card-reply', text: action.textContent }, '*'));
</script>
</body>
</html>
`;
}

const { values } = parseArgs({ options: {
  video: { type: 'string' }, title: { type: 'string' }, note: { type: 'string' }, alt: { type: 'string' },
  out: { type: 'string' }, action: { type: 'string', default: 'Looks right' },
} });
for (const required of ['video', 'title', 'note', 'alt', 'out']) if (!values[required]) fail(`--${required} is required`);
if (!NAME.test(basename(values.out))) fail(`${basename(values.out)} is not a valid card name`);
const html = videoCard({ video: videoUri(values.video), title: values.title, note: values.note, alt: values.alt, action: values.action });
const bytes = Buffer.byteLength(html);
if (bytes > MAX_CARD_BYTES) fail(`card is ${(bytes / 1048576).toFixed(1)} MiB, the limit is 4 MiB; shorten the clip or render with a higher --crf`);
writeFileSync(values.out, html);
console.log(`${values.out} (${(bytes / 1024).toFixed(0)} KiB)`);
