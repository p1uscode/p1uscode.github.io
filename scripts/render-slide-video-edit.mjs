// Rebuild the narrated video after editing ONE slide's narration.
//   - Per-slide audio is sliced losslessly from the current video's audio
//     (full.wav), EXCEPT slides listed in OVERRIDE, which use a freshly
//     synthesized wav (e.g. a re-recorded VOICEVOX line).
//   - Each slide PNG (re-rendered fresh from the HTML) is held for exactly
//     its audio duration, credit is burned, encoded once at crf18.
//   This keeps every unchanged slide perfectly in sync while the edited
//   slide gets its new (shorter/longer) timing, and the overall timeline
//   re-flows automatically.
//
// Inputs (prepared by caller):
//   /tmp/hq-cuts.txt       88 boundary pts_time (one per line)
//   /tmp/narr/full.wav     full audio decoded losslessly from current video
//   /tmp/narr/slide-11.wav new narration for slide 11 (OVERRIDE)
// Output: /tmp/edit-out.mp4  (verify, then move into place)

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
const narrDir = "/tmp/narr";
const fullWav = path.join(narrDir, "full.wav");
const cutsFile = "/tmp/hq-cuts.txt";
const outFile = "/tmp/edit-out.mp4";
const FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc";
const W = 1920, H = 1080, FPS = 15, CRF = 18;
const OVERRIDE = { 11: path.join(narrDir, "slide-11.wav") }; // 1-based slide -> wav

const t0 = Date.now();
const lap = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const ff = (args) => { const r = spawnSync(ffmpegPath, args, { stdio: ["ignore", "inherit", "inherit"] }); if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" ")); };
function probeDur(file) {
  const p = spawnSync(ffmpegPath, ["-i", file], { encoding: "utf8" });
  const m = (p.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}
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

async function main() {
  const cuts = (await fs.readFile(cutsFile, "utf8")).trim().split("\n").map(Number);
  const N = cuts.length + 1;
  const audioTotal = probeDur(fullWav);
  const start = (s) => (s === 1 ? 0 : cuts[s - 2]);
  const end = (s) => (s === N ? audioTotal : cuts[s - 1]);
  console.log(`slides: ${N}  audioTotal: ${audioTotal.toFixed(2)}s  override: ${Object.keys(OVERRIDE).join(",")}`);

  // ── 1. per-slide audio wavs ──
  for (let s = 1; s <= N; s++) {
    const nn = String(s).padStart(2, "0");
    const out = path.join(narrDir, `slide-${nn}.wav`);
    if (OVERRIDE[s]) { console.log(`  slide ${nn}: OVERRIDE ${path.basename(OVERRIDE[s])}`); continue; }
    const dur = end(s) - start(s);
    ff(["-y", "-loglevel", "error", "-ss", start(s).toFixed(3), "-i", fullWav, "-t", dur.toFixed(3),
        "-c:a", "pcm_s16le", "-ar", "24000", "-ac", "1", out]);
  }
  lap("sliced per-slide audio");

  // ── 2. render fresh PNGs ──
  const pngDir = path.join(deckDir, "slides-png-edit");
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
    if (i < N - 1) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(350); }
  }
  await browser.close();
  server.close();
  lap(`rendered ${N} PNGs`);

  // ── 3. per-slide segments (png held for its audio duration) + credit ──
  const cred = `drawtext=fontfile=${FONT}:text='VOICEVOX\\:ずんだもん':fontcolor=white@0.65:fontsize=24:box=1:boxcolor=black@0.35:boxborderw=10:x=w-tw-30:y=h-th-24`;
  const segDir = path.join(deckDir, "segs-edit");
  await fs.mkdir(segDir, { recursive: true });
  const segList = [];
  for (let s = 1; s <= N; s++) {
    const nn = String(s).padStart(2, "0");
    const png = path.join(pngDir, `slide-${nn}.png`);
    const wav = OVERRIDE[s] || path.join(narrDir, `slide-${nn}.wav`);
    const seg = path.join(segDir, `seg-${nn}.mp4`);
    const dur = probeDur(wav);
    ff(["-y", "-loglevel", "error", "-loop", "1", "-i", png, "-i", wav, "-t", dur.toFixed(3),
        "-vf", cred, "-c:v", "libx264", "-tune", "stillimage", "-preset", "medium", "-crf", String(CRF),
        "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", seg]);
    segList.push(seg);
    if (s % 15 === 0) lap(`segment ${s}/${N}`);
  }
  lap("built all segments");

  // ── 4. concat ──
  const listTxt = path.join(segDir, "list.txt");
  await fs.writeFile(listTxt, segList.map((s) => `file '${s}'`).join("\n"));
  ff(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listTxt, "-c", "copy", "-movflags", "+faststart", outFile]);
  await fs.rm(pngDir, { recursive: true, force: true });
  await fs.rm(segDir, { recursive: true, force: true });

  const stat = await fs.stat(outFile);
  lap(`done: ${outFile}`);
  console.log(`  size: ${(stat.size / 1024 / 1024).toFixed(1)} MB   duration: ${probeDur(outFile).toFixed(2)}s`);
  console.log(`TOTAL BUILD TIME: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
