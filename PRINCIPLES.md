# The 6 principles

[Back to the README](README.md)

## 1. Shape over sentences

If the answer has a shape, show the shape.

| The message is | Chatbot | Show Me |
|---|---|---|
| A choice | A numbered list of pros and cons | The real options, one tap each |
| A change | A summary of what changed | A slider over before and after |
| A long job | A line of narration per step | A board that counts real steps |
| A system | Paragraphs about each part | A map with the problem lit up |
| A place | "Describe where it is" | The human taps the spot |
| Something over time | A play-by-play | A few seconds of video |

**Not everything needs a card.** "Yes", a date or a one-line fix should stay one line.

## 2. Next action first

The one thing to do now is the biggest thing on the card.

- One card, one job.
- No warm-up, no recap, no closing offer.
- The problem is already selected when the card opens.

## 3. One tap, not one paragraph

Answering should cost a tap, not a message.

- A tap fills the human's draft.
- The human presses send. A card never sends by itself.
- A new tap can change the answer.

## 4. Real or nothing

A pretty lie is worse than a wall of text.

- Show real renders, real data and real steps.
- Count what happened. Never draw a guessed plan or a fake percent.
- A failed step stays in the record, even after it's fixed.
- Sample data says it's sample data.
- An animation proves nothing. Unless it's a real recording, it says it's a reenactment.

## 5. Details on demand

Start with the least. Keep the rest one tap away.

- "See every step" is there, and closed by default.
- The words still exist for anyone who wants them.
- A clip plays once and stops on the outcome. Replay is one tap.
- Everyone gets in: touch, keyboard, screen reader labels and reduced motion.

## 6. Part of the conversation

The card belongs to the chat it sits in. It should never feel like a window someone pasted on top.

- **No background of its own.** The card's body is transparent, so the host's page shows through. A darker or lighter box around a card is the first thing that says "this is not from here".
- **No border, no title bar.** No "DIAGRAM · name · FULL SCREEN" strip above it, no 1px frame around it. The card is a figure in the text, with the page's own corner radius.
- **One quiet icon for full screen.** A single ↗ in the corner, half-faded until you hover or focus. No words. It still has a label for screen readers.
- **Full screen means the whole screen.** Phone or desktop, the viewer fills the viewport. Its toolbar is icons only, so it can never be wider than the screen and push the close button out of reach.
- **Say your colour scheme.** A card declares `color-scheme: dark` (or light) to match its host. Browsers paint an opaque canvas behind a frame whose scheme differs from the page, and that opaque box is exactly the detached look this principle is against.

| Detached | Part of the conversation |
|---|---|
| A darker panel with a header strip and a FULL SCREEN button | The same pixels, flat on the page, one ↗ in the corner |
| Full screen that is a wide dialog you scroll sideways on a phone | Full screen that is the phone screen |

## Before you send

1. Could this be a look or a tap instead of a paragraph?
2. Is the next action the first thing they see?
3. Is everything on it real?
4. Can they get the details if they want them?
5. Does it sit on the page, or in a box of its own?

## Why this helps ADHD brains

These principles follow the [`i-have-adhd`](https://github.com/ayghri/i-have-adhd) skill by ayghri. That skill makes an agent's writing easier to act on. Show Me applies the same ideas to the screen.

| ADHD writing rule | In a card |
|---|---|
| Next action first | The main button is the biggest thing |
| Numbered steps | A board or map in a fixed order |
| Restate state | The card always shows where things stand |
| Show visible wins | Stages turn green and stay green |
| Say errors plainly | "1 failed. Fixing it." |
| Keep lists short | At most a few options on one card |
| Cut tangents | One card, one job |

It helps everyone else too. Nobody enjoys reading a wall of text.
