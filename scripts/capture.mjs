// Rebuilds the README images from the real gallery. Needs ffmpeg on the PATH.
// Run with: node scripts/capture.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { card, launch, ROOT, serve } from './lib.mjs';

const OUT = join(ROOT, 'assets');
const GIF = { width: 1100, height: 440, framesPerSecond: 6, seconds: 15 };
const CLIP = { framesPerSecond: 10, seconds: 7.8 };
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

// Grabs frames in real time, then turns them into a small looping GIF.
async function record(seconds, name, shoot, framesPerSecond = GIF.framesPerSecond) {
  const dir = mkdtempSync(join(tmpdir(), 'show-me-gif-'));
  const started = Date.now();
  for (let index = 0; index < framesPerSecond * seconds; index += 1) {
    await shoot(join(dir, `${String(index).padStart(4, '0')}.png`), index);
    const wait = started + (index + 1) * 1000 / framesPerSecond - Date.now();
    if (wait > 0) await new Promise(done => setTimeout(done, wait));
  }
  const gif = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(framesPerSecond), '-i', join(dir, '%04d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
    '-loop', '0', join(OUT, name)], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  if (gif.status !== 0) throw new Error(gif.stderr);
  console.log(`assets/${name}`);
}

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
await hero.evaluate(() => {
  const talk = document.querySelector('#work-board .talk');
  const lines = [...talk.querySelectorAll('p')];
  for (const line of lines) line.hidden = true;
  let shown = 0;
  const next = () => { lines[shown].hidden = false; shown += 1; talk.scrollTop = talk.scrollHeight; if (shown < lines.length) setTimeout(next, 820); };
  next();
});
await frame.getByRole('button', { name: 'Replay' }).click();
await record(GIF.seconds, 'hero.gif', path => hero.screenshot({ path }));
await motion.close();

// The clip has to move in the README too, so it gets a GIF of the real gallery.
const clipContext = await browser.newContext({ viewport: { width: GIF.width, height: 760 } });
const clipPage = await clipContext.newPage();
await clipPage.goto(site.url);
await clipPage.addStyleTag({ content: '#draft { display: none !important; }' });
const clipFrame = await card(clipPage, 'motion-clip');
const pair = clipPage.locator('#motion-clip .pair');
const video = clipFrame.locator('video');
await video.waitFor();
// Screenshots are slower than playback, so step to each exact moment instead of filming it.
await record(CLIP.seconds, 'motion-clip.gif', async (path, index) => {
  await video.evaluate((clip, time) => new Promise(done => {
    clip.pause();
    clip.addEventListener('seeked', done, { once: true });
    clip.currentTime = time;
  }), index / CLIP.framesPerSecond);
  await pair.screenshot({ path });
}, CLIP.framesPerSecond);
await clipContext.close();

await browser.close();
site.close();
console.log(`chatbot total ${words}`);
