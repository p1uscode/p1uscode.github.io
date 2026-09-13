#!/usr/bin/env node
// Assemble a narrated slide video from per-slide WAVs (produced by synth.mjs)
// and the deck HTML.
//
//   1. Render every slide to a 1920x1080 PNG via Playwright/Chromium.
//   2. Per slide: hold the PNG for (audio duration + gap), pad audio with
//      trailing silence to match, burn a credit, encode one segment (aac).
//   3. Concat all segments losslessly (-c copy) into the output mp4.
//
// Each slide's audio comes from <in>/slide-NN.wav (NN = 1-based, zero-padded).
// Requires the repo's node_modules (playwright + ffmpeg-static).
//
// Usage:
//   node build.mjs --html <deck.html> --in <wavdir> --out <out.mp4>
//                  [--credit <text>] [--gap 0.15] [--fps 15] [--crf 18] [--font <path>]

import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def; };

const html = arg("html");
const inDir = arg("in");
if (!html || !inDir) {
  console.error("usage: build.mjs --html <deck.html> --in <wavdir> --out <out.mp4> [--credit <text>] [--gap 0.15] [--fps 15] [--crf 18] [--font <path>]");
  process.exit(1);
}
const deckDir = path.dirname(path.resolve(html));
const htmlName = path.basename(html);
const deckBase = htmlName.replace(/\.html?$/i, "");
const outFile = path.resolve(arg("out", path.join("/tmp", `${deckBase}-irodori.mp4`)));
const credit = arg("credit", "Voice: Irodori-TTS");
const GAP = parseFloat(arg("gap", "0.15"));
const FPS = parseInt(arg("fps", "15"), 10);
const CRF = parseInt(arg("crf", "18"), 10);
const FONT = arg("font", "/System/Library/Fonts/Hiragino Sans GB.ttc");
const limit = parseInt(arg("limit", "0"), 10); // >0: only build the first N slides (smoke test)
const W = 1920, H = 1080;

const t0 = Date.now();
const lap = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const ff = (args) => { const r = spawnSync(ffmpegPath, args, { stdio: ["ignore", "ignore", "inherit"] }); if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" ")); };
function probeDur(file) {
  const p = spawnSync(ffmpegPath, ["-i", file], { encoding: "utf8" });
  const m = (p.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}
function mime(p) {
  return { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript",
           ".png": "image/png", ".svg": "image/svg+xml", ".mp4": "video/mp4",
           ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" }[path.extname(p).toLowerCase()] || "application/octet-stream";
}
function serve(dir) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/" || p === "") p = "/" + htmlName;
    const fp = path.join(dir, p);
    if (!fp.startsWith(dir)) return res.writeHead(403).end();
    createReadStream(fp).on("error", () => res.writeHead(404).end("not found"))
      .pipe(res.writeHead(200, { "Content-Type": mime(fp) }));
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ server, url: `http://127.0.0.1:${server.address().port}/${htmlName}` })));
}

async function main() {
  const src = await fsp.readFile(html, "utf8");
  const m = src.match(/<script[^>]*id="speaker-notes"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("speaker-notes <script> not found in " + html);
  const total = JSON.parse(m[1]).length;
  const N = limit > 0 ? Math.min(limit, total) : total;

  // Verify all slide wavs exist.
  const wavs = [];
  for (let i = 1; i <= N; i++) {
    const w = path.join(inDir, `slide-${String(i).padStart(2, "0")}.wav`);
    if (!fs.existsSync(w)) throw new Error(`missing audio: ${w} (run synth.mjs first)`);
    wavs.push(w);
  }
  console.log(`deck: ${deckBase}  slides: ${N}${limit > 0 ? ` (limited from ${total})` : ""}  out: ${outFile}`);

  // ── 1. render PNGs ──
  const pngDir = path.join(deckDir, `.slides-png-${deckBase}`);
  await fsp.mkdir(pngDir, { recursive: true });
  const { server, url } = await serve(deckDir);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-deck-active]", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const ds = document.querySelector("deck-stage");
    if (ds && ds.shadowRoot) {
      const st = document.createElement("style");
      st.textContent = ".overlay,.tapzones{display:none!important}";
      ds.shadowRoot.appendChild(st);
    }
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

  // ── 2. per-slide segments (png held for audio+gap, audio padded to match) ──
  const safeCredit = credit.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
  const cred = `drawtext=fontfile=${FONT}:text='${safeCredit}':fontcolor=white@0.65:fontsize=24:box=1:boxcolor=black@0.35:boxborderw=10:x=w-tw-30:y=h-th-24`;
  const segDir = path.join(deckDir, `.segs-${deckBase}`);
  await fsp.mkdir(segDir, { recursive: true });
  const segList = [];
  for (let s = 1; s <= N; s++) {
    const nn = String(s).padStart(2, "0");
    const png = path.join(pngDir, `slide-${nn}.png`);
    const wav = wavs[s - 1];
    const seg = path.join(segDir, `seg-${nn}.mp4`);
    const dur = probeDur(wav) + (s < N ? GAP : 0);
    ff(["-y", "-loglevel", "error", "-loop", "1", "-i", png, "-i", wav, "-t", dur.toFixed(3),
        "-vf", `${cred},fps=${FPS},format=yuv420p`,
        "-c:v", "libx264", "-tune", "stillimage", "-preset", "medium", "-crf", String(CRF),
        "-af", "apad", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", seg]);
    segList.push(seg);
    if (s % 15 === 0) lap(`segment ${s}/${N}`);
  }
  lap("built all segments");

  // ── 3. concat ──
  const listTxt = path.join(segDir, "list.txt");
  await fsp.writeFile(listTxt, segList.map((s) => `file '${s}'`).join("\n"));
  ff(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listTxt, "-c", "copy", "-movflags", "+faststart", outFile]);
  await fsp.rm(pngDir, { recursive: true, force: true });
  await fsp.rm(segDir, { recursive: true, force: true });

  const stat = await fsp.stat(outFile);
  lap(`done: ${outFile}`);
  console.log(`  size: ${(stat.size / 1024 / 1024).toFixed(1)} MB   duration: ${probeDur(outFile).toFixed(2)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
