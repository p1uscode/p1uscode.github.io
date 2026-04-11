# LLM の 1 回の呼び出し

エージェントの全てのやり取りは、結局のところ **「LLM API を 1 回叩く」の繰り返し**でできている。この章では、その「1 回」の中身 — リクエストに何が入っていて、レスポンスから何が返ってくるか — を手を動かして確認する。

ここを理解しておくと、tool calling もエージェントループも「その 1 呼び出しの入出力にちょっと構造を足したもの」として自然に読めるようになる。

## エージェントから見た「1 回の呼び出し」の位置

[第 1 章](01-overview.md) のフロー図のうち、今回見るのはこの矢印:

```
  エージェント ──────── prompt ────────► LLM
            ◄──── assistant 応答 ─────
```

この 1 往復の中身を覗く。

## 最小リクエスト

OpenAI 互換 API (= Chat Completions) の最小リクエストは、**モデル名** と **メッセージ配列** の 2 つだけ:

```json
{
  "model": "claude-sonnet-4-6",
  "messages": [
    { "role": "system", "content": "あなたは親切な日本語のアシスタントです。" },
    { "role": "user",   "content": "富士山の高さは?" }
  ]
}
```

- `model`: どのモデルに解かせるか。LiteLLM 経由なら `claude-sonnet-4-6` / `gemini-2.5-flash` / `gpt-5.4` 等、`services/litellm/config.yaml` で定義したエイリアスがそのまま使える
- `messages`: 会話履歴。配列の**順序**が会話の順序を表し、LLM はこれを上から順に読んで「次に何を言うべきか」を推論する

### role の意味

各メッセージには `role` が付き、主なのは 4 種類:

| role | 誰の発言か | 典型的な中身 |
|---|---|---|
| `system` | **エージェント設計者**から LLM への指示 | 「あなたは X です」「次のルールに従え」「回答は日本語で」 |
| `user` | **人間ユーザ** の発言 | 実際の質問 / 依頼 |
| `assistant` | **LLM 自身の過去の発言** | 会話履歴を再送するときに、前回の LLM 応答もこの role で配列に含める |
| `tool` | ツール実行の結果 (第 5 章で扱う) | tool_calls の結果を LLM に戻すときに使う |

重要なのは `system` も `user` も **LLM への入力文字列の一部でしかない**こと。LLM の内部状態が `system` を「特別扱い」する学習を受けているので、通常は user メッセージより強く指示として働くが、**絶対的な権威ではない** (プロンプトインジェクションが成立する理由)。

## API は会社ごとに違う。ただし「OpenAI 互換」がデファクトスタンダード

ここまで「Chat Completions の形」として紹介してきた `{model, messages: [{role, content}]}` という構造は、実は**OpenAI が最初に決めた API 仕様**であって、本来 Anthropic や Google のモデルとは何の関係もない。各社のネイティブ API を並べるとこうなる:

| プロバイダ | ネイティブエンドポイント | リクエスト形状 (概略) |
|---|---|---|
| **OpenAI** | `POST /v1/chat/completions` | `{ model, messages: [{role, content}] }` |
| **Anthropic** | `POST /v1/messages` | `{ model, system, messages: [{role, content}], max_tokens }` ※ `system` が別フィールド |
| **Google (Gemini)** | `POST /v1beta/models/{model}:generateContent` | `{ contents: [{role, parts: [{text}]}], systemInstruction, generationConfig }` ※ role 名も "user"/"model" |
| **Cohere / Mistral / ...** | 各社それぞれ | それぞれの流儀 |

リクエストフィールド名、role の語彙、ツール呼び出しのスキーマ、ストリーミングチャンクの形、エラーレスポンス、ヘッダ認証方式 ... どれも微妙に違う。「同じ会話 API だろう」と思って書いたクライアントは別社のモデルではそのまま動かない。

### それなのに curl 一発で色々なモデルが叩けるのはなぜか

**ほぼ全てのプロバイダ (と LLM 関連 OSS) が OpenAI 互換のエンドポイントを別途提供している**から。ChatGPT の普及で OpenAI API のクライアント/ツール/SDK エコシステムが圧倒的になり、**「OpenAI 形式でも受ける」ことが新規モデルを市場に送り出す実質的な必須条件**になった。結果として:

- **Anthropic**: ネイティブは `/v1/messages` だが、OpenAI 互換エンドポイント `/v1/chat/completions` も提供
- **Google (Gemini)**: OpenAI 互換モード `https://generativelanguage.googleapis.com/v1beta/openai/` を公式に用意
- **Mistral / DeepSeek / Groq / Together / Fireworks / 各種ホスティング**: 最初から OpenAI 互換を出している会社も多い
- **Ollama / vLLM / llama.cpp / LM Studio**: ローカル推論サーバ系は軒並み OpenAI 互換
- **LiteLLM**: 本リポジトリが使っているように、**OpenAI 互換の見た目で受けて、各社ネイティブ API に翻訳して投げる**プロキシ

つまり実務上は **「新しいモデル API = OpenAI-compatible である」がほぼ暗黙の期待値**になっていて、自分が書いているクライアントコードは実質 OpenAI 形式しか知らなくて済む。本リポジトリで `baseURL=http://litellm.home.arpa/v1` と設定しただけで Claude も Gemini も Ollama も同じコードで叩けているのはこの構造のおかげ。

### それでも「会社ごとの違い」は 100% は隠せない

互換モードは万能ではなく、以下のようなところで各社の個性が漏れてくる:

- **Tool calling のスキーマ**: 根っこは JSON Schema で同じだが、`tool_choice` の値や `tool_calls` の返却形式が微妙に違う
- **推論モデル固有のパラメータ**: OpenAI の `reasoning_effort` / Anthropic の `thinking` / Gemini の `thinkingConfig` など、互換層がまだ追随していない機能がある
- **プロンプトキャッシュ**: Anthropic の `cache_control` や Gemini の Context Caching は OpenAI 形式には無いので、互換モード経由だとそのまま使えない or 専用のメタデータが必要
- **ストリーミング形式**: SSE のチャンク区切りや `delta` の中身が微妙に違うことがある
- **エラーコード / レート制限ヘッダ**: `429` や `503` の返し方、retry-after ヘッダの有無などが違う
- **トークン計算**: ネイティブでは別のトークナイザを使っているので、同じ文字列でも `usage.prompt_tokens` がモデルごとに異なる

**「LiteLLM を通せば全部同じ」のは 80 点で、残り 20 点は各プロバイダの固有機能**。本リポジトリで扱う範囲では 80 点で十分なのでここで深追いはしないが、「なぜ OpenAI 形式で書いているのか = デファクト標準に寄せたから」という前提は頭に置いておくと、後々 Claude の prompt_caching や Gemini の thinking に触れたときに混乱しなくて済む。

### 図にするとこう

```
        ┌─────────────────────────┐
        │  クライアント / エージェント │
        │  (OpenAI 形式で書く)     │
        └───────────┬─────────────┘
                    │ POST /v1/chat/completions
                    ▼
            ┌────────────────┐
            │    LiteLLM     │  受け口は OpenAI 互換、
            │  (翻訳プロキシ) │  中で各社ネイティブに変換
            └───┬────┬───┬───┘
                │    │   │
     ┌──────────┘    │   └──────────┐
     ▼               ▼              ▼
┌─────────┐   ┌───────────┐   ┌──────────┐
│ OpenAI  │   │ Anthropic │   │  Gemini  │
│(ネイティブ)│ │/v1/messages│  │generateContent│
└─────────┘   └───────────┘   └──────────┘
```

本リポジトリ構成では、エージェントは LiteLLM だけを相手にしていればよく、LiteLLM 側で「claude-sonnet-4-6 はここ、gemini-2.5-flash はここ」と `services/litellm/config.yaml` に書いたルーティングに従って実際のプロバイダに翻訳される。

## curl で実際に 1 発叩く

LiteLLM が動いている前提で、ホストから直接 (整形に `jq` を使う。mise で入れている):

```sh
curl -s http://litellm.home.arpa/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-none" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "system", "content": "あなたは簡潔な日本語アシスタント。"},
      {"role": "user",   "content": "富士山の高さは何メートル?"}
    ]
  }' | jq
```

応答の要点だけ欲しければ jq で絞り込む:

```sh
# 生成文字列と usage だけ見る
curl -s http://litellm.home.arpa/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"富士山の高さは?"}]}' \
  | jq '{text: .choices[0].message.content, usage}'
```

返ってくる JSON の主要フィールドはこんな感じ (抜粋・整形済み):

```json
{
  "id": "chatcmpl-xxxxxxxx",
  "object": "chat.completion",
  "created": 1775850000,
  "model": "gemini-2.5-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "富士山の高さは 3,776 メートルです。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 18,
    "total_tokens": 60
  }
}
```

### 読み方

- `choices[0].message` — **LLM の応答そのもの**。`role: "assistant"` 固定で、`content` が生成文字列。複数の候補を返させる `n` オプションもあるが、通常は 1 つだけ
- `finish_reason` — なぜ生成が止まったか
  - `stop`: 自然終了 (LLM が「もう言うことがない」と判断)
  - `length`: `max_tokens` 上限に達した (応答が途中で切れている可能性)
  - `tool_calls`: ツール呼び出しを返した (第 5 章)
  - `content_filter`: セーフティフィルタに引っかかった
- `usage` — **このリクエストで消費したトークン数**
  - `prompt_tokens`: 入力 (system + user + 過去の assistant / tool + ツールスキーマ) の合計
  - `completion_tokens`: LLM が生成した出力の長さ
  - `total_tokens`: 上の合計 = 課金対象
- `model` — 実際に使われたモデル名。LiteLLM 経由だとエイリアスで指定してもここには元モデルが返ることもある

## 1 呼び出しはステートレス

ここが一番はまりやすいポイント。**LLM API は 1 呼び出しごとに完全に独立**で、サーバ側には何も記憶が残らない。

```
┌────────────┐                            ┌─────────┐
│エージェント │ ── POST (messages=[...]) ─►│ LLM API │
│            │ ◄── { choices: [...] } ─── │         │
└────────────┘                            └─────────┘
                                          ⬅ 次の呼び出しでは
                                            この LLM は
                                            直前の呼び出しを
                                            完全に忘れている
```

会話が続いているように見えるのは、**エージェント側が過去のメッセージを毎回再送しているから**であって、LLM が「前回」を記憶しているわけではない。これが第 7 章 [記憶の多層モデル](07-memory.md) の L3 「コンテキスト注入」の正体。

裏を返すと、LLM に何かを伝えたければ **この 1 回のリクエストに全部詰め込むしかない**。

- ユーザの名前を知らせたい → `messages` に書く
- 会社のナレッジを参照させたい → `messages` に書く (= RAG)
- 過去の会話を覚えていてほしい → `messages` に書く
- 利用可能なツールを知らせたい → 後述する `tools` フィールドに書く

LLM 側にあるのは「受け取った文字列」と「学習済みの重み」だけで、それ以外の情報源はない。

## エージェント側のコードだとどこ?

`examples/agent-demo/src/setup.ts` で `ChatOpenAI` インスタンスを作っているところが、まさにこの「1 呼び出し」の設定:

```typescript
const llm = new ChatOpenAI({
  model: MODEL,                     // ← "model" フィールドに入る
  temperature: 0,                   // ← サンプリングパラメータ (後の章)
  apiKey: "sk-none",
  configuration: {
    baseURL: LLM_BASE_URL,          // ← LiteLLM エンドポイント
  },
});
```

そして実際に叩くのが `agent.invoke({ messages: [...] })` の中で、LangChain が内部で上記の `POST /v1/chat/completions` を組み立てている。エージェントが「1 ターンの応答」を得るために、この呼び出しを**何回も繰り返す**のが次章以降のテーマ。

## 料金とレイテンシの感覚

1 呼び出しのコストは `usage.total_tokens` × モデルのトークン単価。

- 単価はモデルごとに大きく違う (Gemini Flash は 1 M トークンあたり数十セント、Claude Opus は 10 ドル超えることも)
- 同じ質問でも `system` prompt や履歴が長ければ `prompt_tokens` が増えて課金増
- 推論モデル (GPT-5.4 reasoning 等) は内部の思考トークンも `completion_tokens` に乗ってくるので、見た目の応答が短くても請求は大きい

レイテンシも同じように、モデル / トークン量 / 推論深度で数 100 ms から数十秒まで幅がある。**エージェントは 1 ターンの応答のために LLM を 3〜10 回呼ぶことが普通**なので、1 呼び出しの速度 × ラウンド数が体感レイテンシになる。

## 実験してみるとわかること

同じ質問を何度か投げると、**毎回少しずつ違う応答**が返ってくることに気付くはず (本リポジトリの agent-demo はデフォルト `temperature: 0` なので揺れは小さいが、完全には固定されない)。

これは LLM が確率分布に基づいて次のトークンをサンプルしているため。この「どのくらい揺らすか」を制御するのがサンプリングパラメータで、第 12 章で詳しく扱う。

また、`messages` に何も文脈を与えず `"今日は何日?"` とだけ聞いてみると、モデルによって:

- 「分かりません」と素直に返す
- 学習カットオフ時点の日付を「今日」として適当に返す
- 「私は現在の日付を知らない」と丁寧に説明する

など反応が分かれる。これが [第 1 章](01-overview.md) の Q1 「LLM は時刻を知らない」の実機確認になる。

## まとめ

- **LLM API の 1 呼び出し** = `model` と `messages` を渡して、`choices[0].message` と `usage` を受け取る
- **`messages` の順序**が会話の順序。`role` は `system` / `user` / `assistant` / `tool` の 4 種
- **サーバ側は無記憶**。エージェントが毎回全履歴を送る
- **入力に無いものは LLM には伝わらない**。名前、ツール、文脈、全部 `messages` か `tools` に書き下す必要がある
- **コストとレイテンシは `usage` とモデル単価で決まる**。エージェントは 1 ターンで複数回叩くので、1 呼び出しのコストがそのまま積算される
