// Clean full rebuild of the narrated video — CONTINUOUS audio (no per-segment
// AAC concat artifacts).
//   1. Parse the 89 speaker notes from the deck HTML.
//   2. Synthesize each with VOICEVOX (ずんだもん, speaker 3)  -> slide-NN.wav
//   3. Concat all wavs + a fixed inter-slide gap, LOSSLESSLY, into one wav.
//   4. Re-render all 89 slide PNGs from the HTML.
//   5. ONE ffmpeg pass: concat-image-with-durations video + credit drawtext,
//      muxed with the single continuous audio (encoded to AAC exactly once).
//
// Requires VOICEVOX engine on http://127.0.0.1:50021 (docker).
// Output: /tmp/fresh-out.mp4  (verify, then move into place)

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
const html = path.join(deckDir, "ai-agent-introduction.html");
const narrDir = "/tmp/narr-fresh";
const outFile = "/tmp/fresh-out.mp4";
const ENGINE = "http://127.0.0.1:50021";
const SPEAKER = 3;            // ずんだもん ノーマル
const GAP = 0.15;            // added silence between slides (s)
const FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc";
const W = 1920, H = 1080, FPS = 15, CRF = 18;

const t0 = Date.now();
const lap = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const ff = (args) => { const r = spawnSync(ffmpegPath, args, { stdio: ["ignore", "inherit", "inherit"] }); if (r.status !== 0) throw new Error("ffmpeg failed"); };
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
    createReadStream(fp).on("error", () => res.writeHead(404).end()).pipe(res.writeHead(200, { "Content-Type": mime(fp) }));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, url: `http://127.0.0.1:${server.address().port}/ai-agent-introduction.html` })));
}
async function synth(text, outPath) {
  const q = await fetch(`${ENGINE}/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent(text)}`, { method: "POST" });
  if (!q.ok) throw new Error("audio_query failed: " + q.status);
  const query = await q.json();
  const s = await fetch(`${ENGINE}/synthesis?speaker=${SPEAKER}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  if (!s.ok) throw new Error("synthesis failed: " + s.status);
  await fs.writeFile(outPath, Buffer.from(await s.arrayBuffer()));
}

async function main() {
  await fs.mkdir(narrDir, { recursive: true });
  const src = await fs.readFile(html, "utf8");
  const m = src.match(/<script[^>]*id="speaker-notes"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("speaker-notes not found");
  const notes = JSON.parse(m[1]);
  const N = notes.length;
  console.log(`notes: ${N}`);

  // ── 1. synthesize each note ──
  for (let i = 0; i < N; i++) {
    const nn = String(i + 1).padStart(2, "0");
    await synth(notes[i], path.join(narrDir, `slide-${nn}.wav`));
    if ((i + 1) % 15 === 0) lap(`synth ${i + 1}/${N}`);
  }
  lap(`synthesized ${N} wavs`);

  // ── 2. silence wav (GAP) matching format (24kHz mono s16le) ──
  const sil = path.join(narrDir, "sil.wav");
  ff(["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", String(GAP), "-c:a", "pcm_s16le", sil]);

  // per-slide display duration = wav + GAP (last slide: no trailing gap)
  const durs = [];
  for (let i = 0; i < N; i++) durs.push(probeDur(path.join(narrDir, `slide-${String(i + 1).padStart(2, "0")}.wav`)) + (i < N - 1 ? GAP : 0));

  // ── 3. continuous audio: concat wavs interleaved with silence (lossless) ──
  const aList = [];
  for (let i = 0; i < N; i++) {
    aList.push(`file '${path.join(narrDir, `slide-${String(i + 1).padStart(2, "0")}.wav`)}'`);
    if (i < N - 1) aList.push(`file '${sil}'`);
  }
  const aListTxt = path.join(narrDir, "audio.txt");
  await fs.writeFile(aListTxt, aList.join("\n"));
  const bigWav = path.join(narrDir, "big.wav");
  ff(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", aListTxt, "-c", "copy", bigWav]);
  lap(`continuous audio: ${probeDur(bigWav).toFixed(2)}s`);

  // ── 4. render PNGs ──
  const pngDir = path.join(deckDir, "slides-png-fresh");
  await fs.mkdir(pngDir, { recursive: true });
  const { server, url } = await serve(deckDir);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-deck-active]", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { const ds = document.querySelector("deck-stage"); const st = document.createElement("style"); st.textContent = ".overlay,.tapzones{display:none!important}"; ds.shadowRoot.appendChild(st); });
  await page.keyboard.press("Home");
  await page.waitForTimeout(500);
  for (let i = 0; i < N; i++) {
    await page.screenshot({ path: path.join(pngDir, `slide-${String(i + 1).padStart(2, "0")}.png`) });
    if (i < N - 1) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(350); }
  }
  await browser.close(); server.close();
  lap(`rendered ${N} PNGs`);

  // ── 5. one ffmpeg pass: image-concat video + credit, mux continuous audio ──
  const vList = [];
  for (let i = 0; i < N; i++) {
    vList.push(`file '${path.join(pngDir, `slide-${String(i + 1).padStart(2, "0")}.png`)}'`);
    vList.push(`duration ${durs[i].toFixed(3)}`);
  }
  vList.push(`file '${path.join(pngDir, `slide-${String(N).padStart(2, "0")}.png`)}'`); // repeat last for concat demuxer
  const vListTxt = path.join(pngDir, "video.txt");
  await fs.writeFile(vListTxt, vList.join("\n"));
  const cred = `drawtext=fontfile=${FONT}:text='VOICEVOX\\:ずんだもん':fontcolor=white@0.65:fontsize=24:box=1:boxcolor=black@0.35:boxborderw=10:x=w-tw-30:y=h-th-24`;
  lap("encoding (single video pass + single AAC)…");
  ff(["-y", "-loglevel", "error", "-stats",
      "-f", "concat", "-safe", "0", "-i", vListTxt,
      "-i", bigWav,
      "-vf", `${cred},fps=${FPS},format=yuv420p`,
      "-c:v", "libx264", "-tune", "stillimage", "-preset", "medium", "-crf", String(CRF),
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-movflags", "+faststart", outFile]);
  await fs.rm(pngDir, { recursive: true, force: true });

  const stat = await fs.stat(outFile);
  lap(`done: ${outFile}`);
  console.log(`  size: ${(stat.size / 1024 / 1024).toFixed(1)} MB   duration: ${probeDur(outFile).toFixed(2)}s`);
  console.log(`TOTAL BUILD TIME: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
