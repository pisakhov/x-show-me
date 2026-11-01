// Rebuilds the README images from the real gallery. Needs ffmpeg on the PATH.
// Run with: node scripts/capture.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { card, launch, ROOT, serve } from './lib.mjs';

const OUT = join(ROOT, 'assets');
const GIF = { width: 1100, height: 440, framesPerSecond: 6, seconds: 15 };
mkdirSync(OUT, { recursive: true });

const site = await serve();
const browser = await launch();

// Each card is captured in the state a person would see right after using it.
const POSE = {
  'point-at-it': async frame => frame.getByRole('button', { name: 'Pay $28.00' }).click({ position: { x: 40, y: 10 } }),
  'tap-through-map': async () => {},
  'tap-to-decide': async frame => frame.getByRole('button', { name: /Sticky Pay button/ }).click(),
  'work-board': async frame => frame.getByText('Done. The Pay button works on phones.').waitFor({ timeout: 15000 }),
  'drag-to-compare': async (frame, page) => {
    await page.waitForTimeout(2600);
    await frame.locator('#stage').click({ position: { x: 190, y: 60 } });
  },
};

const stills = await browser.newContext({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
const page = await stills.newPage();
await page.goto(site.url);
await page.addStyleTag({ content: '#draft { display: none !important; }' });
const words = await page.locator('#words').textContent();
for (const [id, pose] of Object.entries(POSE)) {
  await pose(await card(page, id), page);
  await page.waitForTimeout(250);
  await page.locator(`#${id} .pair`).screenshot({ path: join(OUT, `${id}.png`) });
  console.log(`assets/${id}.png`);
}
await stills.close();

// The hero: the chatbot's wall of text grows while the board stays one calm line.
const motion = await browser.newContext({ viewport: { width: GIF.width, height: GIF.height } });
const hero = await motion.newPage();
await hero.goto(`${site.url}#work-board`);
await hero.addStyleTag({ content: `
  html { scroll-behavior: auto; } body { overflow: hidden; }
  .wrap { padding: 8px; width: 100%; } .hero, .switch, #draft, .score, .end, section.step { display: none; }
  #work-board { display: block; padding: 0; border: 0; } #work-board h2, #work-board > p { display: none; }
  .side { height: ${GIF.height - 16}px; } .talk { font-size: 15px; }` });
const frame = await card(hero, 'work-board');
await frame.getByRole('button', { name: 'Replay' }).waitFor();
const dir = mkdtempSync(join(tmpdir(), 'show-me-gif-'));
await hero.evaluate(() => {
  const talk = document.querySelector('#work-board .talk');
  const lines = [...talk.querySelectorAll('p')];
  for (const line of lines) line.hidden = true;
  let shown = 0;
  const next = () => { lines[shown].hidden = false; shown += 1; talk.scrollTop = talk.scrollHeight; if (shown < lines.length) setTimeout(next, 820); };
  next();
});
await frame.getByRole('button', { name: 'Replay' }).click();
const started = Date.now();
const total = GIF.framesPerSecond * GIF.seconds;
for (let index = 0; index < total; index += 1) {
  await hero.screenshot({ path: join(dir, `${String(index).padStart(4, '0')}.png`) });
  const wait = started + (index + 1) * 1000 / GIF.framesPerSecond - Date.now();
  if (wait > 0) await hero.waitForTimeout(wait);
}
await motion.close();
await browser.close();
site.close();

const gif = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(GIF.framesPerSecond), '-i', join(dir, '%04d.png'),
  '-vf', 'split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
  '-loop', '0', join(OUT, 'hero.gif')], { encoding: 'utf8' });
rmSync(dir, { recursive: true, force: true });
if (gif.status !== 0) throw new Error(gif.stderr);
console.log(`assets/hero.gif; chatbot total ${words}`);
