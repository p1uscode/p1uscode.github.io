# マルチモーダルと他のモデル

ここまでは「LLM = テキスト in / テキスト out」で話を進めてきた。現実には AI モデルは**画像・音声・動画・ベクトル**等様々なモダリティを扱っている。この章では主要な「他のモデル」を整理し、本リポジトリの 00-14 章の知識が**そのまま応用できる**ことを示す。

## モダリティの一覧

現代の AI モデルを入出力モダリティで整理すると:

| カテゴリ | 入力 | 出力 | 例 |
|---|---|---|---|
| **LLM** | テキスト | テキスト | GPT-4 / Claude / Gemini (テキストモード) |
| **VLM** (Vision-Language Model) | 画像 + テキスト | テキスト | GPT-4o / Claude Opus 4 / Gemini 2.5 |
| **ASR** (Automatic Speech Recognition) | 音声 | テキスト | Whisper / Deepgram / ElevenLabs STT |
| **TTS** (Text-to-Speech) | テキスト | 音声 | ElevenLabs / OpenAI TTS / Google TTS |
| **画像生成** | テキスト (±画像) | 画像 | DALL-E 3 / Midjourney / Stable Diffusion / Flux |
| **動画生成** | テキスト (±画像/動画) | 動画 | Sora / Veo / Runway / Kling |
| **埋め込みモデル** | テキスト / 画像 / 音声 | ベクトル | text-embedding-3 / CLIP / Voyage |
| **音声生成 (音楽)** | テキスト | 音楽 | Suno / Udio / MusicGen |
| **3D 生成** | テキスト / 画像 | 3D モデル | Meshy / Tripo |
| **Omni-modal** | 任意 | 任意 | GPT-4o / Gemini 2.5 / Claude Opus 4 |

近年は**単一モデルが複数モダリティを扱う**方向に進んでいる (omni-modal)。以下、主要なものを個別に見る。

## VLM (Vision-Language Model)

**画像とテキストを同時に扱える LLM の拡張**。基本的には「画像も tokenizer でトークン化して、テキストと同じ transformer に流す」という構造。

### 入力形式 (OpenAI 互換)

`messages` の `content` が配列になり、テキストと画像を混在できる:

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "この画像に何が写っていますか?" },
    { "type": "image_url", "image_url": { "url": "https://example.com/photo.jpg" } }
  ]
}
```

または base64 エンコードで直接埋め込み:

```json
{ "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,/9j/4A..." } }
```

### 何ができるか

- **画像の説明** (what is in this image?)
- **OCR** (画像内のテキスト抽出)
- **図表の読み取り** (グラフ / スクリーンショット / UI レイアウト)
- **Visual QA** (画像に対する質問応答)
- **画像の分類 / 検出** (古典的 CV の代替)
- **スクリーンショット理解** (UI 自動化 / アクセシビリティ)

### エージェントで扱うとき

基本的に**テキスト LLM と同じ**。エージェント側のコード (agent-demo の `ChatOpenAI` 等) で messages に画像を含めれば、VLM はそのまま動く。tool calling も問題なく使える。

**要注意ポイント**:

- 画像 1 枚で数百〜数千トークン消費する (コスト / context window 圧迫)
- 画像の解像度を下げると精度も下がる
- 細かい文字の OCR は専用 OCR の方が良いケースも

## ASR / TTS (音声)

**音声 → テキスト** (ASR) と **テキスト → 音声** (TTS)。従来は専用モデル (Whisper / Deepgram / ElevenLabs) を使ってきたが、最近は omni-modal な LLM が直接扱う。

### ASR: Whisper

OSS 代表の Whisper (OpenAI) が事実上のスタンダード。

- 多言語対応 (99 言語以上)
- ローカル実行可能 (GPU なしでも動く)
- `faster-whisper` 等の高速実装あり

エージェントから使うには **tool** として wrap するのが自然:

```typescript
export const transcribeTool = tool(
  async ({ audio_url }) => {
    const audio = await fetch(audio_url).then(r => r.arrayBuffer());
    const result = await whisper.transcribe(audio);
    return result.text;
  },
  { name: "transcribe", description: "Transcribe audio to text.", schema: z.object({ audio_url: z.string() }) },
);
```

### TTS

テキスト → 音声合成。代表的な SaaS:

- **ElevenLabs**: 高品質・多言語・声のクローニング
- **OpenAI TTS**: GPT-4o 内蔵 / API
- **Google Cloud TTS / Azure Speech**: 企業向け

こちらも tool として wrap。エージェントが応答の一部を音声で返したい場合に使う。

### リアルタイム音声対話

omni-modal LLM (GPT-4o / Gemini Live) はテキストを介さず直接音声入出力をサポート。WebSocket 経由で streaming:

```
マイク入力 (音声) → LLM → 音声出力 (直接)
```

従来の「ASR → LLM → TTS」の 3 段構成よりレイテンシが低く、自然な対話が可能。ただし API が OpenAI Realtime API / Gemini Live のような専用形式で、OpenAI 互換エンドポイントとは別。

## 画像生成 (Diffusion)

**テキストから画像を生成するモデル**。LLM とは全く違う仕組み (diffusion = ノイズから徐々に画像を作る)。

### 代表的なモデル

- **DALL-E 3** (OpenAI): ChatGPT 経由 / API
- **Midjourney**: Discord bot 経由 (API は限定)
- **Stable Diffusion / SDXL / SD3**: OSS、ローカル実行可能
- **Flux** (Black Forest Labs): OSS、SD 系より高品質
- **Imagen 3** (Google): Gemini 経由
- **Ideogram**: テキスト描画に強い

### エージェントで扱うとき

画像生成もまた **tool** として wrap:

```typescript
export const generateImageTool = tool(
  async ({ prompt }) => {
    const result = await openai.images.generate({ model: "dall-e-3", prompt });
    return result.data[0].url;
  },
  { name: "generate_image", description: "Generate an image from text.", schema: z.object({ prompt: z.string() }) },
);
```

LLM は「どういう画像を作るか」を決め、diffusion モデルが実際に生成する。**LLM + diffusion の組み合わせ**で「もっと明るい色にして」「背景を変えて」のような会話的な画像編集ができる。

### ローカル実行

Stable Diffusion や Flux は M 系 Mac / GPU で動かせる。ComfyUI / Automatic1111 / Fooocus 等の UI ツールが有名。本リポジトリには入っていないが、Ollama と同じく**ホスト側に直接インストール**するのが正道 (GPU を使うので)。

## 動画生成

**テキストや画像から動画を生成**。2024-2025 で急速に実用化。

- **Sora** (OpenAI)
- **Veo** (Google DeepMind)
- **Runway Gen-3**
- **Kling** (Kuaishou)
- **Pika**

入力:

- **text-to-video**: プロンプトから生成
- **image-to-video**: 静止画に動きを付ける
- **video-to-video**: 既存動画を変換

現時点では:

- 5〜10 秒程度の短尺が中心
- コスト高 (1 動画数セント〜数ドル)
- 一貫性 (人物や物体が動いてもブレない) がまだ課題

エージェントからの扱いは画像生成と同じく tool として wrap。

## 埋め込みモデル (再訪)

[第 8 章 埋め込み](08-embeddings.md) で扱った。text-embedding-3 / BGE / CLIP 等。

- **text embedding**: 文字列 → ベクトル
- **multimodal embedding (CLIP / SigLIP 等)**: 画像とテキストを**同じ空間に埋め込む** → 画像検索がテキストクエリで可能

CLIP の応用例:

- **画像の意味検索**: "猫の写真" という query で猫画像を検索
- **Zero-shot 分類**: 事前定義されたラベルではなく任意のテキストで分類

## 「エージェント = コアモデル + ツール + state」の公式は変わらない

本章で挙げた全モダリティに共通するのは、**エージェントの骨格が変わらない**こと。

```
[ユーザ] ─ 入力 (テキスト/画像/音声) ─► [エージェント] ─► [コアモデル]
                                            │
                                            ▼
                                        [ツール]
                                            │
                                            ▼
                                    - Whisper (ASR)
                                    - ElevenLabs (TTS)
                                    - DALL-E / Flux (image gen)
                                    - Runway (video gen)
                                    - CLIP (multimodal search)
                                    - search / calc / fetch (第 4 章)
                                            │
                                            ▼
                                        結果
                                            │
                                            ▼
                                       [コアモデル]
                                            │
                                            ▼
                                       最終応答
```

**コアモデルが LLM でも VLM でも omni-modal でも、「tool を呼んで外部能力を借りる」という構造は同じ**。だから:

- 章 01 の API 形式はそのまま
- 章 03 の messages / state もそのまま (content が配列化されるだけ)
- 章 04 の tool calling もそのまま
- 章 05 のエージェントループもそのまま
- 章 07 の observability もそのまま (span の中身に image_url 等が入るだけ)

ここまで学んだ全ての知識は、他のモダリティのエージェントにもそのまま通用する。

## 代表的な「マルチモーダルエージェント」パターン

### (1) スクリーンショット操作エージェント

- 入力: デスクトップのスクリーンショット
- VLM が「どこに何があるか」を理解
- tool: `click(x, y)` / `type(text)` / `scroll()` を LLM が決定して呼ぶ
- 例: Claude Computer Use / OpenAI Operator / Anthropic Computer Use API

### (2) 会議議事録エージェント

- 入力: 音声ファイル or リアルタイム音声
- ASR で文字起こし (tool)
- LLM が要約 + アクションアイテム抽出
- tool: Slack / メール送信

### (3) ドキュメント読解エージェント

- 入力: PDF / 画像 / スキャン
- VLM で画像として読むか、OCR tool でテキスト化
- LLM が質問応答

### (4) ビジュアルレポート生成

- 入力: データ (JSON / CSV)
- LLM が分析 + グラフの仕様を決定
- tool: plotly / matplotlib でグラフ生成
- (オプション) 画像生成モデルでアイキャッチも作る

## まとめ

- 現代の AI モデルは **LLM / VLM / ASR / TTS / 画像生成 / 動画生成 / 埋め込み** 等多様
- **VLM** は LLM の自然な拡張。`messages.content` が配列化される以外は同じ
- **ASR / TTS / 画像 / 動画生成** はエージェントから**tool として**扱うのが基本
- **omni-modal モデル** (GPT-4o / Gemini / Claude Opus 4) は単一モデルで複数モダリティを扱う。リアルタイム音声対話も可能
- **「エージェント = コアモデル + ツール + state」という骨格はどのモダリティでも同じ**
- 章 00-14 で学んだ知識は全てそのまま他モダリティに応用できる
- 画像生成 / 動画生成は GPU 依存なのでローカル実行はホスト直インストール (Ollama と同じ理由、[setup/ollama.md](../setup/ollama.md))
