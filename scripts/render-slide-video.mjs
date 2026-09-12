// Build a narrated MP4 of the ai-agent-introduction deck:
//   1. Capture each slide as a 1920x1080 PNG via Playwright (deck-stage keyboard nav)
//   2. For each slide, make a segment video = the slide PNG held for its narration mp3 length
//   3. Concat all segments into one MP4
//
// Usage: node scripts/render-slide-video.mjs [narrationDir] [outFile]
//   narrationDir default: ai/slides/ai-agent-introduction/narration-zundamon
//   outFile      default: ai/slides/ai-agent-introduction/ai-agent-introduction-zundamon.mp4

import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const deckDir = path.join(repoRoot, "ai/slides/ai-agent-introduction");
const narrationDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(deckDir, "narration-zundamon");
const outFile = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(deckDir, "ai-agent-introduction-zundamon.mp4");

const W = 1920, H = 1080, FPS = 15;

function mime(p) {
  return { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript",
           ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4" }[path.extname(p).toLowerCase()] || "application/octet-stream";
}
function serve(dir) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/" || p === "") p = "/ai-agent-introduction.html";
    const fp = path.join(dir, p);
    if (!fp.startsWith(dir)) return res.writeHead(403).end();
    fs.stat(fp).then(() => { res.writeHead(200, { "Content-Type": mime(fp) }); createReadStream(fp).pipe(res); })
      .catch(() => res.writeHead(404).end("not found"));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, url: `http://127.0.0.1:${server.address().port}/ai-agent-introduction.html` })));
}

async function main() {
  // slide count = number of narration mp3 (slide-NN.mp3)
  const files = (await fs.readdir(narrationDir)).filter((f) => /^slide-\d+\.mp3$/.test(f)).sort();
  const N = files.length;
  if (!N) throw new Error(`no slide-NN.mp3 in ${narrationDir}`);
  console.log(`slides: ${N}\nnarration: ${narrationDir}\nout: ${outFile}`);

  // ── 1. capture PNGs ──
  const pngDir = path.join(deckDir, "slides-png");
  await fs.mkdir(pngDir, { recursive: true });
  const { server, url } = await serve(deckDir);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-deck-active]", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  // hide deck-stage controls overlay + tap zones
  await page.evaluate(() => {
    const ds = document.querySelector("deck-stage");
    const st = document.createElement("style");
    st.textContent = ".overlay,.tapzones{display:none!important}";
    ds.shadowRoot.appendChild(st);
  });
  await page.keyboard.press("Home");
  await page.waitForTimeout(500);

  for (let i = 0; i < N; i++) {
    const label = await page.getAttribute("[data-deck-active]", "data-screen-label").catch(() => null);
    await page.screenshot({ path: path.join(pngDir, `slide-${String(i + 1).padStart(2, "0")}.png`) });
    if ((i + 1) % 15 === 0) console.log(`  captured ${i + 1}/${N}  (${label || ""})`);
    if (i < N - 1) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(350); }
  }
  await browser.close();
  server.close();
  console.log("captured all slides");

  // probe a media file's duration (seconds) via ffmpeg stderr
  const probeDur = (file) => {
    const p = spawnSync(ffmpegPath, ["-i", file], { encoding: "utf8" });
    const m = (p.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
  };

  // ── 2. per-slide segment videos (png held for EXACT mp3 duration) ──
  // NOTE: use -t <dur>, not -shortest. `-loop 1 ... -shortest` overshoots
  // (≈2x the audio length) with these settings — a known ffmpeg quirk.
  const segDir = await fs.mkdtemp(path.join(os.tmpdir(), "deckseg-"));
  const segList = [];
  for (let i = 0; i < N; i++) {
    const nn = String(i + 1).padStart(2, "0");
    const png = path.join(pngDir, `slide-${nn}.png`);
    const mp3 = path.join(narrationDir, `slide-${nn}.mp3`);
    const seg = path.join(segDir, `seg-${nn}.mp4`);
    const dur = probeDur(mp3);
    const r = spawnSync(ffmpegPath, [
      "-y", "-loglevel", "error",
      "-loop", "1", "-i", png,
      "-i", mp3,
      "-t", dur.toFixed(3),
      "-c:v", "libx264", "-tune", "stillimage", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", String(FPS),
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", seg,
    ], { stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error(`ffmpeg seg ${nn} failed`);
    segList.push(seg);
    if ((i + 1) % 15 === 0) console.log(`  segment ${i + 1}/${N}`);
  }

  // ── 3. concat ──
  const listTxt = path.join(segDir, "list.txt");
  await fs.writeFile(listTxt, segList.map((s) => `file '${s}'`).join("\n"));
  const c = spawnSync(ffmpegPath, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listTxt, "-c", "copy", "-movflags", "+faststart", outFile], { stdio: ["ignore", "inherit", "inherit"] });
  if (c.status !== 0) throw new Error("ffmpeg concat failed");

  await fs.rm(segDir, { recursive: true, force: true });
  const stat = await fs.stat(outFile);
  // probe duration
  const d = spawnSync(ffmpegPath, ["-i", outFile], { encoding: "utf8" });
  const dm = (d.stderr || "").match(/Duration:\s*(\d+:\d+:\d+\.\d+)/);
  console.log(`\ndone: ${outFile}`);
  console.log(`  size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  duration: ${dm ? dm[1] : "?"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
