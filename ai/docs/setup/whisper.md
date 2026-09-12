# Whisper (ホスト側に導入)

> **音声認識 (STT) が要るときだけ導入する**。stackchan のような「聞いて→考えて→喋る」ロボットの**入力側**を担う。出力側 (TTS) は [VoiceVox](voicevox.md) 側。

ai lab では Whisper を **ホストに直接インストールした [whisper.cpp](https://github.com/ggml-org/whisper.cpp)** で動かし、`whisper.home.arpa` (Traefik → `host.docker.internal:9000`) で叩く。**コンテナ化はしない**。

## なぜホストに入れるのか

Ollama とまったく同じ理由:

- **Apple Silicon の Metal GPU はコンテナから見えない**。Docker Desktop は軽量 Linux VM 上で動くため、コンテナ内 Whisper は CPU 推論に落ちて遅くなる。
- ホスト直インストールなら whisper.cpp が **Metal バックエンド**を直接叩ける。M4 Pro + `large-v3-turbo` で **実時間の 1/10 前後 (RTF≈0.1)** で認識できる。
- コンテナからは `host.docker.internal:9000` で抜けられるのでネットワーク的デメリットは無い。

> **CoreML (ANE) について**: brew の `whisper-cpp` ボトルは **Metal は有効だが CoreML は無効**。CoreML はエンコーダを ANE にオフロードして encoder をさらに数倍速くするが、`WHISPER_COREML=1` でのソースビルドと `.mlmodelc` へのモデル変換 (coremltools) が要る。まず Metal で十分な速度が出るので、レイテンシをさらに詰めたくなった段階で追加する。

## インストール手順

```sh
# 1. whisper.cpp 本体 + ffmpeg (任意フォーマットの音声を 16kHz に変換するのに使う)
brew install whisper-cpp ffmpeg

# 2. モデル取得 (small と large-v3-turbo-q5_0 を services/whisper/models/ に落とす)
mise run whisper:model

# 3. サーバ起動 (ホスト常駐, 0.0.0.0:9000, Metal, 日本語)
#    .env の WHISPER_MODEL / WHISPER_PORT / WHISPER_LANG を使う
mise run whisper:serve
```

`whisper-server` は brew formula にサービス plist が無いため、常駐させたい場合は `nohup mise run whisper:serve &` か launchd の user agent を自前で用意する (Ollama の `brew services` に相当する仕組みは無い)。

## 動作確認

```sh
# (a) ホスト直叩き — 音声ファイルを POST して文字起こし
curl -s -X POST http://localhost:9000/inference \
  -F file=@sample.wav -F response_format=json -F temperature=0

# (b) Traefik 経由 (コンテナ / stackchan から届く経路と同じ)
curl -s -X POST http://whisper.home.arpa/inference \
  -F file=@sample.wav -F response_format=json
# => {"text":"こんにちは、スタックちゃんです。..."}
```

## モデルの選び方

`services/whisper/models/` に置いた ggml モデルを `WHISPER_MODEL` で指す。日本語 stackchan 用途の目安 (M4 Pro / Metal):

| モデル | サイズ | 日本語精度 | 速度 (約6秒音声) | 用途 |
|---|---|---|---|---|
| `ggml-small.bin` | 465MB | 実用 | 速い | 相槌・短い定型コマンド、メモリ節約 |
| `ggml-large-v3-turbo-q5_0.bin` | 547MB | 高い | **~0.66s (RTF≈0.11)** | **既定。精度と速度のバランスが最良** |

`large-v3` フル (非 turbo) は精度最上位だが turbo より遅く、会話ロボのレイテンシには turbo が向く。別モデルを試すときは HuggingFace [`ggerganov/whisper.cpp`](https://huggingface.co/ggerganov/whisper.cpp/tree/main) から `.bin` を落として `WHISPER_MODEL` を差し替える。

## stackchan からの使い方

- M5Stack 側でマイク録音した音声 (16kHz PCM/WAV) を `http://whisper.home.arpa/inference` に multipart POST → `text` を受け取り、その文字列を LLM (`litellm.home.arpa`) に渡す → 返答を [VoiceVox](voicevox.md) で合成して再生、という 3 段構成。
- M5 は名前解決できないので、ロボ側は**ホストの IP 直打ち + `Host: whisper.home.arpa` ヘッダ**にするか、Traefik に IP ルールを追加する (VoiceVox と同じ運用)。
- レイテンシを詰めるなら **VAD で発話区切りを検出して確定した分だけ即 POST** する。長い無音を含めて丸ごと投げると音声長に比例して認識時間が伸びる。
- `whisper-server` の `--convert` を付けているので、M5 が吐く WAV のサンプリングレートが 16kHz でなくても ffmpeg 側で吸収される。
