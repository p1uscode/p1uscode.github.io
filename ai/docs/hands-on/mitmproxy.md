# ハンズオン 3: mitmproxy で生の LLM 通信を覗く

LiteLLM はクライアントから OpenAI 互換の形で受けて、裏で Anthropic / Gemini 等のプロバイダ固有形式に**翻訳**してから外に投げている。この翻訳された後の**生 HTTP リクエスト / レスポンス**を mitmproxy で直接覗く。

## ゴール

- LiteLLM が「裏で何を送っているか」を自分の目で確認する
- Anthropic / OpenAI / Gemini のネイティブ API 形式の違いを実機で見る
- 「デバッグで一番真実に近いレイヤ」としての mitmproxy の使い所を把握する

## 事前準備

- `mise run up:litellm` で LiteLLM + mitmproxy が両方起動している
- `.env` に少なくとも 1 つの LLM API キーが入っている
- [ハンズオン 1](open-webui.md) でチャットを投げた履歴が少し溜まっている

## 本リポジトリでの mitmproxy の位置付け

`services/litellm/docker-compose.yml` を見ると、mitmproxy は LiteLLM の**アウトバウンド HTTP プロキシ**として設定されている:

```yaml
litellm:
  environment:
    - HTTP_PROXY=http://mitmproxy:8080
    - HTTPS_PROXY=http://mitmproxy:8080
    - REQUESTS_CA_BUNDLE=/home/mitmproxy/.mitmproxy/mitmproxy-ca-cert.pem
    - SSL_CERT_FILE=/home/mitmproxy/.mitmproxy/mitmproxy-ca-cert.pem
```

つまり LiteLLM が Anthropic / OpenAI / Gemini に投げる**全 HTTPS リクエストが mitmproxy 経由**になっていて、mitmproxy が TLS を MITM して中身を読める状態にしている (テスト / デバッグ用途)。

## 手順

### 1. mitmweb にアクセス

<http://mitmproxy.home.arpa>

`.env` の `MITMPROXY_WEB_PASSWORD` でログイン (空なら認証なし)。

mitmweb の UI が開く。左側にリクエスト一覧、右側に選択したリクエストの詳細。

### 2. Open WebUI から何か 1 つ質問を投げる

[ハンズオン 1](open-webui.md) の要領で、Open WebUI から新しい質問を投げる:

```
富士山の高さは?
```

### 3. mitmweb に戻って観察

リクエスト一覧に新しい行が追加されているはず。ホスト名は:

- Anthropic モデルを使ったなら `api.anthropic.com`
- OpenAI モデルなら `api.openai.com`
- Gemini なら `generativelanguage.googleapis.com`

を叩く行が並ぶ。

### 4. リクエスト詳細を開く

1 つ選んで、右側の詳細を見る:

**Request タブ**

- URL (プロバイダのネイティブエンドポイント)
- Headers (認証トークンが入っている、機密なので扱い注意)
- Body (JSON、プロバイダネイティブ形式)

**Anthropic の場合の典型的な Request body**:

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 4096,
  "messages": [
    { "role": "user", "content": "富士山の高さは?" }
  ],
  "system": "..."
}
```

- `system` が**別フィールド**になっているのが OpenAI 形式との違い ([theory 01](../theory/01-llm-call.md) の表と見比べ)
- `max_tokens` が必須

**OpenAI の場合**:

```json
{
  "model": "gpt-4.1",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user",   "content": "富士山の高さは?" }
  ]
}
```

`system` も `messages` 配列内に入る。

**Gemini の場合**:

```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "富士山の高さは?" }] }
  ],
  "systemInstruction": { "parts": [{ "text": "..." }] }
}
```

全く別物。`messages` ではなく `contents`、`role` 名も `user` / `model`、`parts` で画像等も同じ配列に混在できる構造。

### 5. Response を見る

同じリクエスト行の Response タブで、プロバイダからの生レスポンスを確認。

**Anthropic の場合**:

```json
{
  "id": "msg_xxxxxx",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "富士山の高さは約 3,776 メートルです。" }
  ],
  "model": "claude-sonnet-4-6",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 28
  }
}
```

- `content` が配列になっていて、各要素が `type` を持つ
- `usage` のフィールド名が `input_tokens` / `output_tokens` (OpenAI は `prompt_tokens` / `completion_tokens`)
- `stop_reason` は `end_turn` (OpenAI は `stop`)

LiteLLM はこれを**OpenAI 互換形式に変換**してクライアントに返している。[theory 01](../theory/01-llm-call.md) の「OpenAI 互換がデファクト」の翻訳レイヤがここで動いている。

### 6. ツール呼び出しのリクエストを見る (次のハンズオン後に)

[ハンズオン 4](agent-demo.md) で agent-demo を動かすと、`tools` フィールドを含むリクエストが見えるようになる。その時点でもう一度 mitmweb に戻ってくると、**ネイティブ形式のツール定義**がどう表現されているかが確認できる (Anthropic は `tools` / OpenAI は `tools` / Gemini は `tools.functionDeclarations`)。

### 7. ストリーミングのチャンクを見る

Open WebUI から応答を受け取ると、実際には SSE (Server-Sent Events) でストリーミングされていることが多い。mitmweb では Response の中身が**チャンクごとに分かれて表示**される (`data: {...}` の繰り返し)。各チャンクには 1 〜 数トークンずつの差分が入っている。

これが LLM が「1 トークンずつ生成している」実機証拠。[theory 14 LLM の仕組み](../theory/14-llm-internals.md) の「次トークン予測の連鎖」を目で見ている状態。

## 何に使えるか

mitmproxy は普段使いのツールではないが、以下の場面で活躍する:

- **LiteLLM の翻訳が怪しいとき**: クライアント側のエラーが分かりにくいときに、生のプロバイダレスポンスを見る
- **プロバイダ固有機能のデバッグ**: Anthropic の `cache_control` / Gemini の `thinkingConfig` 等、LiteLLM 互換層ではうまく通らない機能
- **API 使用量の確認**: 何を送ったか / レスポンスが何だったかを正確に把握
- **プロバイダ固有の制限に引っかかったとき**: rate limit / content filter / その他エラーの生フォーマット

本番では動かしっぱなしにせず、**調査時だけ有効化**するのが通例。

## セキュリティ上の注意

- mitmproxy は TLS MITM をするので、**認証トークンが mitmweb の UI から見える**。機密扱いすること
- ホストに向けて公開しない (本リポジトリでは Traefik で LAN 内限定の `*.home.arpa` に限定済み)
- 本番環境では**無効化**するか、アクセス制御を厳しくする

## 観察できた現象の対応章

| 観察 | 対応する座学 |
|---|---|
| プロバイダごとに request/response 形式が違う | [01 LLM の 1 回の呼び出し](../theory/01-llm-call.md) "API は会社ごとに違う" |
| LiteLLM が形式を翻訳している | 同上 |
| usage のフィールド名が違う | [02 トークンとコンテキストウィンドウ](../theory/02-tokens-context.md) |
| SSE チャンクで 1 トークンずつ来る | [14 LLM の仕組み](../theory/14-llm-internals.md) "次トークン予測の連鎖" |

## 次

次は LLM 単体ではなく、**ツールを呼べるエージェント**を動かす: [agent-demo を動かす](agent-demo.md)。
