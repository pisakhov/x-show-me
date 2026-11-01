---
name: show-me
description: 'Show instead of tell. Use when the answer has a shape: a choice, a comparison, a long job, a system, a place on a screen, or something that happens over time. Build a small interactive HTML card or a few seconds of video instead of writing paragraphs.'
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
| A flow of a few states | Flipbook: a scrubber over real screenshots |
| Something that happens over time | Motion clip: a few seconds of video |

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
- It is part of the conversation: `body { background: transparent }`, no outer border, no title bar, and `<meta name="color-scheme" content="dark">` (or light) to match the host. The host adds the full-screen icon; the card never does.

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

## Flip through it

A flipbook is a scrubber over real screenshots: motion over time without a video pipeline. Use it for a flow of three to eight states (open, zoom, close). Capture each state at the same viewport, then:

```bash
node flipbook-card.mjs --frame "Card in the chat=f1.jpg" --frame "Full screen=f2.jpg" \
  --title "Full screen, frame by frame" --note "Real screenshots" --fps 1.5 --action "Keep it" --out card.html
```

It plays once when seen and stops on the last frame; drag the scrubber, tap the stage or press ←/→ to step. Reduced motion opens on the last frame. JPEG frames keep six frames under 500 KiB.

## Play a clip

Use a clip only when the point is the movement: a bug that unfolds, a flow, a transition. Keep it under 10 seconds. A still image or a slider is better when nothing needs to move.

A model doesn't output video. You write the clip as HTML, and a renderer turns it into an MP4. These steps use [HyperFrames](https://github.com/heygen-com/hyperframes), which needs Node 22 or newer and FFmpeg.

Copy `clip-template.html` to `clip/index.html` in this folder and rewrite its words and timeline for your story. Then run this in `clip/`:

```bash
export HYPERFRAMES_NO_TELEMETRY=1
npx hyperframes check
npx hyperframes snapshot --at 1,3,5
npx hyperframes render . -o clip.mp4
node ../video-card.mjs --video clip.mp4 --title "Why Pay failed" --note "Reenactment" \
  --alt "What happens in the clip" --action "Add to the release notes" --out card.html
```

- `check` must pass. Read the frames from `snapshot` before you render.
- An animation proves nothing. `--note` says what it is: "Reenactment" unless it's a real recording.
- `--alt` tells the whole story in words for anyone who can't watch it.
- The card plays once when it's seen and stops on the outcome. Never loop. With reduced motion it opens on the outcome and waits for Replay.
- A real recording skips the first steps. Any H.264 MP4 works with `video-card.mjs`.
- Don't run `hyperframes publish`. It uploads the clip.
- Over 4 MiB? Shorten the clip or render with a higher `--crf`.

## Check it

```bash
node verify-card.mjs card.html
```

This fails on errors, overflow, a card taller than its frame, broken images, a video that won't play, small targets or a card over 4 MiB. Read the screenshots it writes and fix anything ugly.

The first time, run `npm install playwright` in this folder. If Chrome isn't installed, also run `npx playwright install chromium`. Video cards need real Chrome: `npx playwright install chrome`.

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
5. Does it sit on the page, or in a box of its own?
