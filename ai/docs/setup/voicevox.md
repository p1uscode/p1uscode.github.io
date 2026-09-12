# VoiceVox (音声合成 / TTS)

> **音声合成 (TTS) が要るときだけ導入する**。stackchan のような「聞いて→考えて→喋る」ロボットの**出力側**を担う。入力側 (STT) は [Whisper](whisper.md) 側。

ai lab では [VOICEVOX ENGINE](https://github.com/VOICEVOX/voicevox_engine) を **コンテナ**で動かし、`voicevox.home.arpa` (Traefik → コンテナ `:50021`) で叩く。

## なぜコンテナで良いのか

Ollama / Whisper と違い、**VOICEVOX ENGINE は CPU 推論**で GPU を使わない。したがって「Metal GPU がコンテナから見えない」問題の影響を受けず、他のサービスと同じく素直にコンテナ化できる。M4 Pro なら CPU でも実用的な速度が出る (下記実測)。

- **arm64 native イメージを明示ピン** (`cpu-arm64-${VOICEVOX_VERSION}`)。amd64 を掴むと Docker Desktop の QEMU エミュレーションで推論が数倍遅くなる。
- `--cpu_num_threads 4` でバッチ合成時に全コアを食い切らないよう絞り、他サービスと共存させる。

## 起動と確認

```sh
# 起動 (初回はモデルロードで数秒。restart: always で常駐 = warm 維持)
mise run up:voicevox

# 疎通確認
curl -s http://voicevox.home.arpa/version   # => "0.25.2"

# 合成 (2 段: audio_query でクエリ生成 → synthesis で WAV 化)
#   speaker=3 は「ずんだもん(ノーマル)」
curl -s -X POST "http://voicevox.home.arpa/audio_query?text=こんにちは&speaker=3" -o q.json
curl -s -X POST "http://voicevox.home.arpa/synthesis?speaker=3" \
  -H 'Content-Type: application/json' -d @q.json -o out.wav
```

## レイテンシの目安 (M4 Pro / CPU / cpu_num_threads=4, warm)

| 入力 | audio_query | synthesis | WAV サイズ |
|---|---|---|---|
| 短文「はい」 | ~2ms | ~0.26s | 30KB |
| 27 文字の文 (約 4.4s 音声) | ~3ms | ~0.95s | 24kHz: 212KB / 16kHz: 142KB |

- コストはほぼ **synthesis 側**で、**音声長にほぼ比例** (RTF≈0.21)。
- `audio_query` の `outputSamplingRate` を下げても **synth 時間は変わらず、転送量だけ減る** (24k→16k で -33%)。

## stackchan からの使い方

- LLM の返答テキストを `voicevox.home.arpa` に POST → WAV を受けて M5Stack の I2S で再生。
- **句点で分割して 1 文ずつ合成→再生をパイプライン化**すると time-to-first-audio が大きく縮む。長文を丸ごと投げると synth が線形に伸びる。
- `outputSamplingRate` を M5 の DAC に合わせて下げると WiFi 転送量が減る。
- M5 は名前解決できないので、ロボ側は**ホストの IP 直打ち + `Host: voicevox.home.arpa` ヘッダ**にするか Traefik に IP ルールを追加する ([Whisper](whisper.md) と同じ運用)。
- 起動直後の初回合成はモデルロードで遅い。`up` 後にダミーを 1 発投げて warm 化しておく。
