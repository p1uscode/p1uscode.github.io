# ハンズオン 1: Open WebUI でチャット

最初の一歩。ブラウザから Open WebUI を開いて、実際に LLM と会話し、**どのモデルがどれくらい速いか / コストがかかるか**を体感する。

## ゴール

- Open WebUI の UI を一通り触る
- 複数モデル (Claude / Gemini / GPT) を切り替えて同じ質問を投げる
- モデル別のレイテンシ / 応答の違いを体感する
- **裏で何が起きているか** (LiteLLM → プロバイダ → Langfuse) を把握する

## 事前準備

- `mise run up:traefik up:litellm up:open-webui up:langfuse` が走っている
- `.env` に `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` or `OPENAI_API_KEY` のいずれかが入っている

## 手順

### 1. ブラウザで Open WebUI を開く

<http://open-webui.home.arpa>

初回はサインアップ画面が出る (env で `WEBUI_AUTH=false` にしていれば出ない。本リポジトリの `services/open-webui/docker-compose.yml` では `ENABLE_SIGNUP=false` で制御)。

### 2. モデル一覧を確認

左上のモデル選択メニューをクリックすると、**LiteLLM 経由で利用可能な全モデル**が並んでいるはず:

- `claude-opus-4-6` / `claude-sonnet-4-6` / `claude-haiku-4-5`
- `gpt-4.1` / `gpt-4.1-mini` / `gpt-4o` / `o3` / `o4-mini`
- `gemini-3.1-pro-preview` / `gemini-3-flash-preview` / `gemini-2.5-pro` / `gemini-2.5-flash`

この一覧は `services/litellm/config.yaml` の `model_list` がそのまま見えているだけ。Open WebUI は LiteLLM を「1 個の OpenAI 互換プロバイダ」として認識していて、その向こう側に複数モデルが並んでいる構造。

### 3. 簡単な質問を投げる

モデルを `gemini-2.5-flash` にして、次を投げてみる:

```
富士山の高さは?
```

応答が返ってくるはず。Gemini Flash なら 1-2 秒で完了する。

### 4. モデルを変えて同じ質問を投げる

新しいチャットを始めて、`claude-sonnet-4-6` で同じ質問:

```
富士山の高さは?
```

**違いを観察**:

- 応答テキストのスタイル / 長さ / 書き方の違い
- レイテンシの違い (Claude Sonnet は少し遅い、Opus はもっと遅い)
- 途中で別のモデルへのフォールバックが起きたら (LiteLLM の fallback 設定が効いている) 応答モデルが切り替わる

### 5. 「今の時間は?」と聞く

モデル問わず聞いてみる:

```
今の時間は何時ですか?
```

多くのモデルは「私は現在の時刻を知りません」と返すはず。これは [theory 00 登場人物](../theory/00-overview.md) の Q1 の実機確認。

- **Open WebUI にはツールが無い**ので、LLM 単体では時刻を知らない
- 同じ質問を agent-demo に投げると `now` ツールを呼んで答える ([ハンズオン 4](agent-demo.md) で確認)

### 6. 長めの質問で usage を観察

ちょっと長い質問を投げる:

```
日本の政策金利の近年の推移と、今後の見通しについて 500 文字程度でまとめてください。
```

応答が返ってきたら、**Open WebUI のメッセージ下部**を見ると:

- 使用したモデル名
- 応答時間
- (モデルによっては) トークン数

が表示されている。これは後で Langfuse でも同じ情報が見える ([ハンズオン 2](langfuse-traces.md))。

### 7. マルチターンで会話を続ける

1 回目:

```
TypeScript の async/await について簡単に説明してください。
```

2 回目 (同じチャット内で続けて):

```
さっきの話を子供向けに言い換えてください。
```

- 2 回目の「さっきの話」が通じるのは、**Open WebUI が会話履歴を毎ターン LiteLLM に送り直している**から
- これが [theory 03 Messages と state](../theory/03-messages-state.md) で書いた「state = クライアントが持つ messages 配列」の実体
- LiteLLM から見ると毎回独立したリクエストで、前回の記憶は無い

### 8. 裏で何が起きているか

このハンズオン中、裏では次が動いていた:

```
ブラウザ
  │ HTTP
  ▼
Open WebUI (コンテナ)
  │ HTTP (OpenAI 互換)
  ▼
LiteLLM (コンテナ)
  │ HTTP (provider 固有形式に変換)
  ▼
Anthropic / OpenAI / Gemini (外部 API)
  │ レスポンス
  ▼
LiteLLM
  │ success_callback: ["langfuse"]
  ├───────────────────────► Langfuse (バックグラウンド送信)
  ▼
Open WebUI
  ▼
ブラウザ
```

- `services/litellm/config.yaml` に `success_callback: ["langfuse"]` が書かれているので、**LiteLLM が自動でトレースを Langfuse に送っている**
- これが次のハンズオン ([Langfuse でトレースを読む](langfuse-traces.md)) の素材になる

## 観察できた現象の対応章

| 観察 | 対応する座学 |
|---|---|
| モデル一覧が LiteLLM 経由で並ぶ | [01 LLM の 1 回の呼び出し](../theory/01-llm-call.md) "OpenAI 互換がデファクト" |
| 同じ質問で応答スタイルが違う | [14 LLM の仕組み](../theory/14-llm-internals.md) "pretraining と instruction tuning の結果" |
| 「今の時間は?」が答えられない | [00 登場人物と責任範囲](../theory/00-overview.md) Q1 |
| マルチターンで文脈が繋がる | [03 Messages と state](../theory/03-messages-state.md) |
| 長い質問ほどトークン消費が増える | [02 トークンとコンテキストウィンドウ](../theory/02-tokens-context.md) |

## 次

次のハンズオンでは、ここで投げた全ての会話が Langfuse に残っているので、それを可視化して読み解く: [Langfuse でトレースを読む](langfuse-traces.md)。
