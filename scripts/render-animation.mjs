#!/usr/bin/env node
// Render ai-agent-introduction animation to mp4.
//
// Drives the Stage timeline deterministically by overriding requestAnimationFrame
// inside capture.html, then steps frame-by-frame, screenshots the 1920x1080
// canvas, and pipes PNG frames to ffmpeg for H.264 encoding.

import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const animDir = path.join(repoRoot, 'ai/slides/ai-agent-introduction/animation');
const outputMp4 = path.join(animDir, 'ai-agent-introduction-animation.mp4');

// Babel-standalone uses XHR to load script[type=text/babel][src=...], which
// browsers block from file:// origins. Serve the animation directory over
// http://127.0.0.1 instead.
function startServer() {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.jsx':  'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
  };
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/' || p === '') p = '/capture.html';
    const filePath = path.join(animDir, p);
    if (!filePath.startsWith(animDir)) { res.writeHead(403).end(); return; }
    fs.stat(filePath).then(() => {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    }).catch(() => { res.writeHead(404).end('not found'); });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/capture.html` });
    });
  });
}

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = parseInt(process.env.FPS || '30', 10);
const DURATION = parseFloat(process.env.DURATION || '83');
const TOTAL_FRAMES = Math.round(DURATION * FPS);
const ENCODER = process.env.ENCODER || 'libx264'; // 'h264_videotoolbox' for mac HW

async function main() {
  const { server, url: captureUrl } = await startServer();

  console.log(`render-animation`);
  console.log(`  src:     ${captureUrl}`);
  console.log(`  dst:     ${outputMp4}`);
  console.log(`  size:    ${WIDTH}x${HEIGHT}`);
  console.log(`  fps:     ${FPS}`);
  console.log(`  dur:     ${DURATION}s (${TOTAL_FRAMES} frames)`);
  console.log(`  encoder: ${ENCODER}`);
  console.log(`  ffmpeg:  ${ffmpegPath}`);
  console.log('');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT + 80 }, // pad for Stage's reserved bar space
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  page.on('pageerror', (e) => console.error('[page error]', e));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[page console]', msg.text());
  });

  await page.goto(captureUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-anim-root]', { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  // Let Babel compile and React mount fully
  await page.waitForFunction(
    () => document.querySelector('[data-anim-root] > div > div:first-child > div'),
    { timeout: 15000 }
  );
  await page.waitForTimeout(500);

  const canvas = await page.$('[data-anim-root] > div > div:first-child > div');
  if (!canvas) throw new Error('canvas element not found');

  const box = await canvas.boundingBox();
  console.log(`canvas bounding box: ${JSON.stringify(box)}`);
  if (Math.abs(box.width - WIDTH) > 2 || Math.abs(box.height - HEIGHT) > 2) {
    console.warn(`WARNING: canvas size mismatch (got ${box.width}x${box.height}, expected ${WIDTH}x${HEIGHT})`);
  }

  const ffArgs = [
    '-y',
    '-hide_banner',
    '-loglevel', 'warning',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', String(FPS),
    '-i', '-',
    '-vcodec', ENCODER,
    '-pix_fmt', 'yuv420p',
    ...(ENCODER === 'libx264'
      ? ['-crf', '18', '-preset', 'medium']
      : ['-b:v', '8M']),
    '-movflags', '+faststart',
    outputMp4,
  ];
  const ffmpeg = spawn(ffmpegPath, ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

  ffmpeg.on('error', (e) => console.error('ffmpeg spawn error:', e));
  const ffmpegDone = new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
  });

  const t0 = Date.now();
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const ts = (f / FPS) * 1000;
    await page.evaluate(async (ts) => {
      window.__driveFrame(ts);
      // give React 18 two microtask + macrotask cycles to commit
      await new Promise(r => setTimeout(r, 0));
      await new Promise(r => setTimeout(r, 0));
    }, ts);

    const buf = await canvas.screenshot({ type: 'png' });
    if (!ffmpeg.stdin.write(buf)) {
      await new Promise(r => ffmpeg.stdin.once('drain', r));
    }

    if (f % 30 === 0 || f === TOTAL_FRAMES - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = (f + 1) / elapsed;
      const eta = (TOTAL_FRAMES - f - 1) / rate;
      process.stdout.write(
        `\r  frame ${f + 1}/${TOTAL_FRAMES} (${(((f + 1) / TOTAL_FRAMES) * 100).toFixed(1)}%) ` +
        `${rate.toFixed(1)} fps · eta ${eta.toFixed(0)}s    `
      );
    }
  }
  process.stdout.write('\n');

  ffmpeg.stdin.end();
  await ffmpegDone;
  await browser.close();
  server.close();

  const stat = await fs.stat(outputMp4);
  console.log(`done: ${outputMp4} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
