#!/usr/bin/env node
// Synthesize per-slide narration WAVs from a deck's `speaker-notes` JSON using
// Irodori-TTS VoiceDesign (caption-only, --no-ref).
//
//   1. Parse the speaker-notes array from the deck HTML (one entry per slide).
//   2. For each slide: split the note on sentence punctuation into <=chunkChars
//      pieces, synthesize each piece with infer.py, concat losslessly -> slide-NN.wav
//   3. Write manifest.json (text/chunks/duration per slide).
//
// Resumable: an existing slide-NN.wav is skipped unless --force.
// Requires: Irodori-TTS set up at $IRODORI_DIR (run setup.sh first) and `uv`.
//
// Usage:
//   node synth.mjs --html <deck.html> [--out <dir>] [--caption <text>]
//                  [--model <hf-id>] [--seed <N>] [--chunk-chars <80>] [--force]

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// ffmpeg: prefer repo's ffmpeg-static, fall back to system ffmpeg.
let FFMPEG = "ffmpeg";
try { const m = await import("ffmpeg-static"); if (m.default) FFMPEG = m.default; } catch { /* use system */ }

const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def; };
const has = (name) => argv.includes(`--${name}`);

const html = arg("html");
if (!html) {
  console.error("usage: synth.mjs --html <deck.html> [--out <dir>] [--caption <text>] [--model <hf-id>] [--seed N] [--chunk-chars 80] [--force]");
  process.exit(1);
}
const deckBase = path.basename(html).replace(/\.html?$/i, "");
const outDir = path.resolve(arg("out", path.join(os.tmpdir(), `irodori-narr-${deckBase}`)));
const model = arg("model", "Aratako/Irodori-TTS-600M-v3-VoiceDesign");
const caption = arg("caption", "落ち着いた声で、聞き取りやすくはっきりと、自然なテンポで解説するように読み上げてください。");
const seed = arg("seed", "42");
const chunkChars = parseInt(arg("chunk-chars", "80"), 10);
const limit = parseInt(arg("limit", "0"), 10); // >0: only synth the first N slides (smoke test)
const force = has("force");
const irodoriDir = process.env.IRODORI_DIR || path.join(os.homedir(), ".cache/irodori-tts/Irodori-TTS");

if (!fs.existsSync(path.join(irodoriDir, "infer.py"))) {
  console.error(`error: Irodori-TTS not found at ${irodoriDir}. Run setup.sh first (or set IRODORI_DIR).`);
  process.exit(1);
}

const t0 = Date.now();
const lap = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
function ff(args) {
  const r = spawnSync(FFMPEG, args, { stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + args.join(" "));
}
function probeDur(file) {
  const p = spawnSync(FFMPEG, ["-i", file], { encoding: "utf8" });
  const m = (p.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}

// Split into <=limit-char chunks on Japanese/ASCII sentence punctuation, keeping delimiters.
function chunkText(text, limit) {
  const sentences = (text.replace(/\s+/g, " ").match(/[^。！？!?]*[。！？!?]?/g) || []).filter((s) => s.trim().length);
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && cur.length + s.length > limit) { chunks.push(cur); cur = ""; }
    cur += s;
    if (cur.length >= limit) { chunks.push(cur); cur = ""; }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks.length ? chunks : [text.trim() || "。"];
}

function infer(text, outWav) {
  const r = spawnSync("uv", [
    "run", "--no-sync", "python", "infer.py",
    "--hf-checkpoint", model,
    "--text", text,
    "--caption", caption,
    "--no-ref",
    "--seed", String(seed),
    "--output-wav", outWav,
  ], { cwd: irodoriDir, stdio: ["ignore", "inherit", "inherit"] });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error("infer.py failed (status " + r.status + ")");
}

async function main() {
  await fsp.mkdir(outDir, { recursive: true });
  const src = await fsp.readFile(html, "utf8");
  const m = src.match(/<script[^>]*id="speaker-notes"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("speaker-notes <script> not found in " + html);
  const notes = JSON.parse(m[1]);
  const N = limit > 0 ? Math.min(limit, notes.length) : notes.length;
  console.log(`deck: ${deckBase}  slides: ${N}${limit > 0 ? ` (limited from ${notes.length})` : ""}  model: ${model}`);
  console.log(`out: ${outDir}\ncaption: ${caption}\n`);

  const manifest = [];
  for (let i = 0; i < N; i++) {
    const nn = String(i + 1).padStart(2, "0");
    const finalWav = path.join(outDir, `slide-${nn}.wav`);
    const note = String(notes[i] ?? "").trim();

    if (!force && fs.existsSync(finalWav) && probeDur(finalWav) > 0) {
      manifest.push({ slide: i + 1, file: path.basename(finalWav), chars: note.length, duration: probeDur(finalWav), skipped: true });
      continue;
    }

    const chunks = chunkText(note, chunkChars);
    const partWavs = [];
    for (let c = 0; c < chunks.length; c++) {
      const part = path.join(outDir, `.slide-${nn}-part-${c}.wav`);
      infer(chunks[c], part);
      partWavs.push(part);
    }
    // Concat parts -> slide wav (lossless; same format from same model).
    if (partWavs.length === 1) {
      await fsp.rename(partWavs[0], finalWav);
    } else {
      const listTxt = path.join(outDir, `.slide-${nn}.txt`);
      await fsp.writeFile(listTxt, partWavs.map((p) => `file '${p}'`).join("\n"));
      ff(["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listTxt, "-c", "copy", finalWav]);
      await Promise.all(partWavs.map((p) => fsp.rm(p, { force: true })));
      await fsp.rm(listTxt, { force: true });
    }
    const dur = probeDur(finalWav);
    manifest.push({ slide: i + 1, file: path.basename(finalWav), chars: note.length, chunks: chunks.length, duration: dur });
    lap(`slide ${nn}/${N}  ${note.length}c -> ${chunks.length} chunk(s)  ${dur.toFixed(2)}s`);
  }

  await fsp.writeFile(path.join(outDir, "manifest.json"),
    JSON.stringify({ deck: deckBase, html, model, caption, seed, slides: N, items: manifest }, null, 2));
  const total = manifest.reduce((a, x) => a + (x.duration || 0), 0);
  lap(`done: ${N} wavs, total narration ${(total / 60).toFixed(1)} min -> ${outDir}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
