---
name: show-me
description: 'Show instead of tell. Use when the answer has a shape: a choice, a comparison, a long job, a system, or a place on a screen. Build a small interactive HTML card instead of writing paragraphs.'
---

# Show Me

A card the human can touch beats a paragraph they have to read.

## Pick the shape

| The message is | Show |
|---|---|
| A choice | Tap to decide: the real options, one tap each |
| A change | Drag to compare: before and after under one slider |
| A long job | Work board: stages counted from real steps |
| A system | Tap-through map: the whole thing, with the problem lit up |
| A place on a screen | Point at it: the human taps the spot |

One sentence is enough? Write the sentence. No card.

## Make the card

Write one self-contained HTML file.

- One card, one job. Put the next action first and make it the biggest thing.
- No network, `fetch`, `localStorage`, forms, or outside scripts and images. Embed images as `data:` URIs.
- Touch and keyboard both work. Targets are at least 44px. Respect reduced motion.
- It fits at 340×300, 760×460 and 1280×800. It stays under 4 MiB.
- Use real material: real renders, real data, real steps. Never guess a plan, fake progress, or hide a failure.
- If something is sample data, say so on the card.
- Never show secrets, tokens, or private text.

## Let a tap answer

```js
parent.postMessage({ type: 'x-card-reply', text: 'Keep this one' }, '*');
```

Run it from a real tap. It fills the human's draft. It never sends. The human presses send.

## Compare

Capture both sides at the same size, the same scroll position and the same crop, tight to what changed.

```bash
node compare-card.mjs --before before.png --after after.png --title "What changed" --out card.html
```

Optional: `--before-label`, `--after-label`, `--keep`, `--back`.

## Check it

```bash
node verify-card.mjs card.html
```

This fails on errors, overflow, a card taller than its frame, broken images, small targets or a card over 4 MiB. Read the screenshots it writes and fix anything ugly.

The first time, run `npm install playwright` in this folder. If Chrome isn't installed, also run `npx playwright install chromium`.

## Show it

If your host renders HTML in a sandboxed frame, hand it the file.

In a terminal, run this and wait. It prints the human's reply to stdout. It waits up to 10 minutes, so run it in the background or with a long tool timeout.

```bash
node show-card.mjs card.html
```

## Before you send

1. Could this be a look or a tap instead of a paragraph?
2. Is the next action the first thing they see?
3. Is everything on it real?
4. Can they get the details if they want them?
