// HQ rebuild of the narrated ai-agent-introduction video.
//   - Re-render all 89 slides fresh from the (updated) HTML at 1920x1080.
//   - Reuse the EXISTING video purely as the timeline/audio source:
//       * slide boundaries (cut times) define when each slide is shown
//       * audio stream is copied 1:1 (no re-encode)
//   - Composite the 89 fresh PNGs over the timeline (full-frame overlay),
//     burn the VOICEVOX credit once, encode a single time at high quality.
//   This yields a single-generation, high-quality video, perfectly synced
//   to the original narration, written to a NEW filename.
//
// Usage: node scripts/render-slide-video-hq.mjs
//   in : ai/slides/ai-agent-introduction/ai-agent-introduction-zundamon.mp4 (timeline + audio)
//        /tmp/hq-cuts.txt (88 boundary pts_time, one per line)
//   out: ai/slides/ai-agent-introduction/ai-agent-introduction-zundamon-hq.mp4

import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const deckDir = path.join(repoRoot, "ai/slides/ai-agent-introduction");
const srcVideo = path.join(deckDir, "ai-agent-introduction-zundamon.mp4");
const outFile = path.join(deckDir, "ai-agent-introduction-zundamon-hq.mp4");
const cutsFile = "/tmp/hq-cuts.txt";
const FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc";
const W = 1920, H = 1080, FPS = 15, CRF = 18;

const t0 = Date.now();
const lap = (label) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);

function mime(p) {
  return { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript",
           ".png": "image/png", ".svg": "image/svg+xml" }[path.extname(p).toLowerCase()] || "application/octet-stream";
}
function serve(dir) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/" || p === "") p = "/ai-agent-introduction.html";
    const fp = path.join(dir, p);
    if (!fp.startsWith(dir)) return res.writeHead(403).end();
    createReadStream(fp).on("error", () => res.writeHead(404).end("not found"))
      .pipe(res.writeHead(200, { "Content-Type": mime(fp) }));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, url: `http://127.0.0.1:${server.address().port}/ai-agent-introduction.html` })));
}
function probeDur(file) {
  const p = spawnSync(ffmpegPath, ["-i", file], { encoding: "utf8" });
  const m = (p.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}

async function main() {
  const cuts = (await fs.readFile(cutsFile, "utf8")).trim().split("\n").map(Number);
  const total = probeDur(srcVideo);
  const N = cuts.length + 1;
  console.log(`boundaries: ${cuts.length}  slides: ${N}  total: ${total.toFixed(2)}s`);

  // ── 1. render fresh PNGs ──
  const pngDir = path.join(deckDir, "slides-png-hq");
  await fs.mkdir(pngDir, { recursive: true });
  const { server, url } = await serve(deckDir);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-deck-active]", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const ds = document.querySelector("deck-stage");
    const st = document.createElement("style");
    st.textContent = ".overlay,.tapzones{display:none!important}";
    ds.shadowRoot.appendChild(st);
  });
  await page.keyboard.press("Home");
  await page.waitForTimeout(500);
  for (let i = 0; i < N; i++) {
    await page.screenshot({ path: path.join(pngDir, `slide-${String(i + 1).padStart(2, "0")}.png`) });
    if ((i + 1) % 15 === 0) lap(`captured ${i + 1}/${N}`);
    if (i < N - 1) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(350); }
  }
  await browser.close();
  server.close();
  lap(`captured all ${N} slides`);

  // ── 2. one-pass composite: overlay 89 fresh PNGs onto timeline, burn credit, encode crf18 ──
  // boundaries: slide1 = [0,cuts[0]), slide i = [cuts[i-2],cuts[i-1]), slide N = [cuts[N-2], end)
  const inputs = [];
  for (let i = 0; i < N; i++) inputs.push("-i", path.join(pngDir, `slide-${String(i + 1).padStart(2, "0")}.png`));
  let fc = "";
  let prev = "0:v";
  for (let i = 0; i < N; i++) {
    const img = `${i + 1}:v`;
    let enable;
    if (i === 0) enable = `lt(t,${cuts[0]})`;
    else if (i === N - 1) enable = `gte(t,${cuts[N - 2]})`;
    else enable = `between(t,${cuts[i - 1]},${cuts[i]})`;
    const out = i === N - 1 ? "ov" : `v${i + 1}`;
    fc += `[${prev}][${img}]overlay=enable='${enable}':eof_action=pass[${out}];`;
    prev = out;
  }
  const cred = `drawtext=fontfile=${FONT}:text='VOICEVOX\\:ずんだもん':fontcolor=white@0.65:fontsize=24:box=1:boxcolor=black@0.35:boxborderw=10:x=w-tw-30:y=h-th-24`;
  fc += `[ov]${cred}[v]`;

  const args = [
    "-y", "-loglevel", "error", "-stats",
    "-i", srcVideo, ...inputs,
    "-filter_complex", fc,
    "-map", "[v]", "-map", "0:a",
    "-c:v", "libx264", "-tune", "stillimage", "-preset", "medium", "-crf", String(CRF),
    "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "copy", "-map_metadata", "0", "-movflags", "+faststart", outFile,
  ];
  lap("encoding (overlay 89 + credit, crf18, audio copy)…");
  const r = spawnSync(ffmpegPath, args, { stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error("ffmpeg composite failed");
  await fs.rm(pngDir, { recursive: true, force: true });

  const stat = await fs.stat(outFile);
  lap(`done: ${outFile}`);
  console.log(`  size: ${(stat.size / 1024 / 1024).toFixed(1)} MB   duration: ${probeDur(outFile).toFixed(2)}s`);
  console.log(`TOTAL BUILD TIME: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
