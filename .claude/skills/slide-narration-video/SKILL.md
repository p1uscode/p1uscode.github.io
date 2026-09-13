---
name: slide-narration-video
description: スライドの speaker-notes から Irodori-TTS(VoiceDesign) で音声を合成し、ナレーション付き解説動画(mp4)を生成する。「スライドを動画に」「ナレーション動画を作る」「Irodori-TTS / VoiceDesign で音声を動画に」等のときに使う。ai/slides 配下のデッキ(speaker-notes JSON 埋め込み HTML)が対象。
---

# slide-narration-video

スライド HTML に埋め込まれた `speaker-notes`(各スライド1ナレーションの JSON 配列) を
[Irodori-TTS](https://github.com/Aratako/Irodori-TTS) の VoiceDesign モデルで音声化し、
各スライドをその音声の長さだけ表示するナレーション動画 (1920x1080 mp4) を作る。

既存の `scripts/render-slide-video-*.mjs`(VOICEVOX/ずんだもん版) の Irodori-TTS 差し替え版。
出力・PNG 化・ffmpeg 結合の考え方は同じだが、音声合成だけ Irodori-TTS に置き換えてある。

## 前提

- macOS(Apple Silicon, MPS) か CUDA Linux。`uv` と `node`(repo の `node_modules` に `playwright`/`ffmpeg-static`) が必要 — このリポジトリでは両方そろっている。
- 対象 HTML に `<script id="speaker-notes" type="application/json">[...]</script>` が埋め込まれていること。
- モデル重みは初回実行時に Hugging Face から自動 DL(`~/.cache/huggingface`)。約600Mパラメータ、MPS/GPU 推論。

## 手順

### 1. セットアップ(初回のみ)

```bash
bash .claude/skills/slide-narration-video/scripts/setup.sh
```

`Irodori-TTS` を `${IRODORI_DIR:-$HOME/.cache/irodori-tts/Irodori-TTS}` に clone し、
プラットフォームに応じた extra (`mac=cpu`/`CUDA=cu128`) で `uv sync` する。リポジトリ本体には clone しない(重みが巨大なため)。冪等。

### 2. 音声合成(各スライド1 wav, 再開可能)

```bash
node .claude/skills/slide-narration-video/scripts/synth.mjs \
  --html ai/slides/ai-agent-introduction/ai-agent-introduction.html
```

- 出力先: `/tmp/irodori-narr-<deck>/slide-NN.wav` と `manifest.json`。
- 長いノートは句点で分割して合成→ロスレス結合(モデルの最大トークン長対策)。
- 既存 wav はスキップ(`--force` で再生成)。**89枚 × MPS 推論で数十分かかる**ので、止まっても再実行で続きから。
- 声質は `--caption "..."`(VoiceDesign のスタイル指定テキスト)で変える。

主なオプション: `--caption <text>` `--model <hf-id>`(既定 `Aratako/Irodori-TTS-600M-v3-VoiceDesign`)
`--seed <N>`(既定 42, 再現性) `--out <dir>` `--chunk-chars <80>` `--limit <N>`(先頭N枚だけ=スモークテスト) `--force`。

### 3. 動画組み立て

```bash
node .claude/skills/slide-narration-video/scripts/build.mjs \
  --html ai/slides/ai-agent-introduction/ai-agent-introduction.html \
  --in /tmp/irodori-narr-ai-agent-introduction \
  --out /tmp/ai-agent-introduction-irodori.mp4
```

playwright で全スライドを PNG 化し、各スライドを `音声長 + gap` 秒表示、右下にクレジットを焼き込み、
スライド毎セグメント(aac)を `-c copy` で結合。主なオプション: `--credit <text>`(既定 `Voice: Irodori-TTS`)
`--gap <0.15>` `--fps <15>` `--crf <18>` `--font <path>`。

### 4. 確認して配置

`/tmp/...irodori.mp4` を再生して同期・声質を確認してから、デッキ横へ移動する
(例: `ai/slides/ai-agent-introduction/ai-agent-introduction-irodori.mp4`)。
**移動・既存ファイルの上書きはユーザに確認してから。**

## ai-agent-introduction のクイックスタート

```bash
D=ai/slides/ai-agent-introduction/ai-agent-introduction.html
bash .claude/skills/slide-narration-video/scripts/setup.sh
node .claude/skills/slide-narration-video/scripts/synth.mjs --html "$D"
node .claude/skills/slide-narration-video/scripts/build.mjs --html "$D" \
  --in /tmp/irodori-narr-ai-agent-introduction \
  --out /tmp/ai-agent-introduction-irodori.mp4
```

## 注意

- **ライセンス/クレジット**: Irodori-TTS のコードは MIT。モデル重みの利用条件・帰属表記は
  [VoiceDesign モデルカード](https://huggingface.co/Aratako/Irodori-TTS-600M-v3-VoiceDesign) を確認し、
  必要なら `--credit` を調整する。v3 は SilentCipher が入っていれば電子透かしを自動付与。
- v2 (`Aratako/Irodori-TTS-500M-v2-VoiceDesign`, note 記事のモデル) も `--model` で使えるが、
  v2 は出力長が固定で `--seconds` 前提のため、自動尺予測の v3 を既定にしている。
- 合成が遅い/途切れる場合は `synth.mjs` を再実行(再開可能)。`build.mjs` は wav がそろってから。
