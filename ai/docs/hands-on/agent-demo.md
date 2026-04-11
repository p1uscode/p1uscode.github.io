# ハンズオン 4: agent-demo を動かす

ここまでは Open WebUI でチャットを叩き、その通信を Langfuse / mitmproxy で**見える化**する流れだった (Open WebUI 自体も機能としては tool 呼び出しを持つが、ここまでのハンズオンでは単発の chat 往復しか使っていない)。この章では、そのチャットの背後で動く**エージェントループ — LLM がツールを選んで呼び、結果を踏まえて次の行動を決める主体 —** を自作して実機で動かし、ここまで見てきた見える化レイヤでそのループ構造を確認する。

## ゴール

- 単発モード / 対話モードの両方を実行する
- LLM がツールを呼ぶ / 呼ばない / 連鎖する様子を実機で観察
- Langfuse のトレースで**階層的な span 構造**を確認
- `AGENT_MODEL` / `AGENT_TOOLS` を切り替えて挙動の違いを体感

## agent-demo の構成

`examples/agent-demo/` に Node.js + TypeScript + LangChain JS の最小エージェント実装が入っている。すべてのモデル呼び出しは LiteLLM 経由で、ツールをループで呼び出し、**全ステップを Langfuse に親子付きの階層トレースとして送信**する。

| ファイル | 役割 |
|---|---|
| `examples/agent-demo/src/tools.ts` | ツール定義の集約 (`search` / `fetch_url` / `wikipedia` / `now` / `calc` / `random_int` / `end_chat`)。`selectTools()` が `AGENT_TOOLS` env を見て該当ツールだけ返す |
| `examples/agent-demo/src/setup.ts` | OTel + Langfuse / LLM / agent 生成 / 共通ヘルパを集約。モードごとの差分だけを 2 つのエントリポイントに残すための層 |
| `examples/agent-demo/src/agent-single.ts` | **単発モード**。CLI 引数を 1 回の `agent.invoke()` に渡して応答を出力して終了 |
| `examples/agent-demo/src/agent-chat.ts` | **対話モード**。`readline` で標準入力ループし、会話履歴を保持しながら複数ターンを繋ぐ。LLM が追加質問を返したときはそのままユーザ入力待ちに戻る。LLM が `end_chat` ツールを呼んだらループ正常終了 |

仕組み:

- LangChain の `createAgent` でツールコールループを実装
- LLM は `ChatOpenAI` を LiteLLM の OpenAI 互換エンドポイント (`http://litellm.home.arpa/v1`) に向けて叩く
- @langfuse/langchain の `CallbackHandler` + @langfuse/otel の `LangfuseSpanProcessor` + @opentelemetry/sdk-trace-node の `NodeTracerProvider` で、エージェントの各 LLM 呼び出し・各ツール呼び出しが親子スパンとして Langfuse に送信される
- Langfuse 接続先は Traefik 経由の `http://langfuse.home.arpa` (ホスト実行前提)

## 事前準備

### 1. サービス起動

`mise run up` で全サービスが起動していること。未設定なら [setup](../setup/README.md) を先に済ませる。

### 2. SearXNG の JSON API を有効化

`search` ツールが SearXNG の JSON API を叩くので有効化が必要。`searxng_data` ボリューム内の `settings.yml` で `search.formats` に `json` が含まれている必要がある。無ければ:

```sh
docker compose -f services/searxng/docker-compose.yml exec searxng vi /etc/searxng/settings.yml
# → search.formats に - json を追加
mise run down:searxng && mise run up:searxng
```

### 3. agent-demo の初回インストール

```sh
cd examples/agent-demo
mise install           # examples/agent-demo/.mise.toml の [tools] に従って node を入れる
cd -

mise run agent:ci      # npm ci (lockfile からの再現可能インストール)
```

依存を**追加/更新**したいときだけ `mise run agent:install` (= `npm install`) を使う。

## 利用可能ツール

`examples/agent-demo/src/tools.ts` で定義されている:

| ツール名 | 機能 |
|---|---|
| `search` | SearXNG でウェブ検索 (上位 5 件を JSON で返す) |
| `fetch_url` | URL を取得して HTML をストリップしたテキスト (3000 文字まで) を返す |
| `wikipedia` | 指定言語 (デフォルト 'ja') の Wikipedia 記事要約を REST API で取得 |
| `now` | 現在時刻 (ISO-8601 / UTC) |
| `calc` | 四則演算 (digits と `+ - * / ( )` のみ許可) |
| `random_int` | `[min, max]` 範囲の乱数整数 |
| `end_chat` | 対話モードで LLM が「会話はもう十分」と判断したときに呼ぶ終了シグナル。単発モードでは使わない |

ツール追加は `tools.ts` に `tool()` で定義して `TOOLS` map に登録するだけ。

## 設定項目 (`examples/agent-demo/.env`)

| 変数 | 例 | 用途 |
|---|---|---|
| `AGENT_MODEL` | `ollama/qwen3.5:9b` (default) / `claude-sonnet-4-6` / `gpt-5.4` | LiteLLM に登録されたモデル名 |
| `AGENT_TOOLS` | `search,now,calc` | 有効ツール (未指定=全ツール) |
| `LLM_BASE_URL` | `http://...` | LiteLLM エンドポイントを上書きしたいとき |
| `SEARXNG_BASE_URL` | `http://searxng.home.arpa` | SearXNG エンドポイント |
| `AGENT_LANGFUSE_HOST` | `http://langfuse.home.arpa` | ホスト側から見える Langfuse URL (コンテナ用 `LANGFUSE_HOST` と別) |

Langfuse 資格情報 (`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`) は root の `.env` に入っていればそのまま流用される。

## 手順

### 1. 最初の実行 (ツールなし = 素の LLM だけ)

まずはツールを一切渡さずに、純粋な LLM 単発応答で動くことだけ確認する。`AGENT_TOOLS=""` で空集合を指定する:

```sh
AGENT_TOOLS="" mise run agent-single -- "富士山の高さは?"
```

出力の冒頭に:

```
[agent-single] model=ollama/qwen3.5:9b tools=[]
```

が出て、続けて「3776 メートルです」のような最終応答が返る。

**観察**:

- `tools=[]` なので LLM に tool を 1 個も宣言していない = 呼びたくても呼びようがない
- 学習済み事実だけで答えている。[theory 01 登場人物と責任範囲](../theory/01-overview.md) Q6 "富士山の高さ" の実機確認
- モデルが小さい / 知識が古いとハルシネーションする可能性もある。ここでもし数値がズレたら、それは**ツールが必要な種類の質問を LLM 単独で解こうとしたときの失敗例**として覚えておくと良い

### 2. 同じ質問にツールを与える

次に、**全ツールを渡した状態で同じ質問**を投げる:

```sh
mise run agent-single -- "富士山の高さは?"
```

出力の冒頭は:

```
[agent-single] model=ollama/qwen3.5:9b tools=[search, fetch_url, wikipedia, now, calc, random_int, end_chat]
```

**観察**:

- ツール 7 個を LLM に宣言している
- **LLM がツールを呼ぶか呼ばないかはモデル次第**:
- Langfuse でトレースを見ると (後述)、同じ質問でもモデルごとに木の形が全く違うことが確認できる
- [theory 06 エージェントループ](../theory/06-agent-loop.md) の「LLM が毎ターン tool を呼ぶかどうか決めている」という部分の実機観察

### 3. 明確にツールが必要な質問

#### 3-a. ツールなし (LLM 単独では答えようがない)

```sh
AGENT_TOOLS="" mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

**観察**:

- **「現在時刻が分からない」「確認する手段がない」と断る**、もしくは**それっぽいデタラメな時刻で答えてしまう**のどちらかになる
- LLM は推論時にクロックを持っていないので、tool を渡さない限り原理的に今の時間は知りようがない ([theory 01](../theory/01-overview.md) Q1)
- これが **"学習済み事実" と "実行時情報" の境界**。#1 の富士山と違い、どんなに賢いモデルでもツールなしでは絶対に正解できない質問

#### 3-b. ツールあり (連鎖で解ける)

```sh
mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

**観察**:

- 応答内で「現在時刻 XX:XX、分 YY × 15 = ZZZ」のような形で返る
- 裏で `now` → `calc` の 2 ツール連鎖が起きている (Langfuse で確認する)
- [theory 06 エージェントループ](../theory/06-agent-loop.md) の具体例。ツールがあると実行時情報を取ってきて、さらにその結果を使って次の行動を決められる

### 4. Langfuse でトレースを見る

[ハンズオン 2](langfuse-traces.md) の要領で <http://langfuse.home.arpa> を開き、Traces を確認。

今回は `LangGraph` という親 trace に加えて:

- `LangGraph` (root)
  - `ChatOpenAI` (iteration 1: 時刻を知るため `now` を呼ぶ判断)
  - `now` (tool 実行、結果 ISO 時刻)
  - `ChatOpenAI` (iteration 2: 分を計算するため `calc` を呼ぶ判断)
  - `calc` (tool 実行、結果数値)
  - `ChatOpenAI` (iteration 3: 最終応答生成)

のような木構造で span が並ぶ。これが [theory 08 Observability](../theory/08-observability.md) の**階層 span の実体**。

各 span をクリックすると、Input/Output に messages 配列や tool 引数が入っているのが見える。

### 5. 並列 tool_calls を誘発してみる

複数の独立した情報を同時に聞くと、LLM が 1 回のレスポンスで複数 `tool_calls` を返すことがある:

```sh
mise run agent-single -- "TypeScript と Python の Wikipedia 記事の要約を両方教えて"
```

Langfuse のトレースで 2 つの `wikipedia` tool 実行が**並列**に走っているか確認できる (timestamps を見ると同じタイミングで start している)。[theory 06](../theory/06-agent-loop.md) の「並列ツール呼び出し」の節。

### 6. ツール絞り込み

`search` と `now` だけ有効にして、同じ質問を投げる:

```sh
AGENT_TOOLS=search,now mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

**観察**:

- ツール一覧に `[search, now]` だけ表示される
- `calc` が使えないので、LLM は自分で 15 倍を計算する (推論モデルなら正答、そうでなければ間違える可能性)
- [theory 05 Tool calling](../theory/05-tool-calling.md) で書いた「道具の品質と LLM 能力の掛け算」の実機確認
- [theory 01](../theory/01-overview.md) の Q3 (計算) の文脈で、**ツールの有無が精度と確実性に直結する**

### 7. モデルを変えてみる (ローカル ↔ クラウド)

デフォルトはローカル Ollama (`ollama/qwen3.5:9b`) で、LiteLLM の `ollama/*` wildcard 経由で `host.docker.internal:11434` に抜けている。`AGENT_MODEL` で任意のモデルに切り替えられる:

```sh
# ローカルの別サイズ (事前に ollama pull が必要)
AGENT_MODEL=ollama/qwen3.5:35b mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"

# クラウドの Gemini
AGENT_MODEL=gemini-2.5-flash mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"

# クラウドの Claude
AGENT_MODEL=claude-sonnet-4-6 mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

**観察**:

- Langfuse の `ChatOpenAI` span の Model メタデータが切り替わる
- **どれも同じ OpenAI 互換 API 経由**で叩いているのに、Model 名だけ変わっている。LiteLLM が provider 固有形式に翻訳しているのが実機で効いている姿
- ツール呼び出し手順は大筋同じだが、**小さい / ローカルのモデルほど過剰にツールを呼ぶ / 最終応答が空になる**等の違いが観察できる ([theory 05](../theory/05-tool-calling.md) の注意点)
- クラウドモデルは速くて安定、ローカルは遅い
- **「ローカル LLM = 外部に何も漏れない」とは限らない**点に注意:
  - `search` は SearXNG を経由して検索エンジンへ問い合わせる
  - `fetch_url` は任意の Web を直接取得する
  - `wikipedia` は Wikipedia REST API に問い合わせる
  - これらのツールは LLM 本体とは別に**外部へ通信する**
- 完全オフラインにしたいなら、ローカル LLM に加えて `AGENT_TOOLS=now,calc,random_int` のように**外部通信しないツールだけ**に絞る必要がある
- [theory 18 ローカル vs クラウド](../theory/18-local-vs-cloud-llm.md) の実機対比

### 8. 対話モードを試す

```sh
mise run agent-chat
```

readline のプロンプト (`you>`) が出るので、以下を順に入力:

```
おすすめを教えて
```

**観察**:

- LLM は曖昧すぎると判断して**追加質問を返す**はず ("どのカテゴリのおすすめ? 映画? 本?")
- **ツールを呼んでいない**こと ([theory 13 system prompt](../theory/13-system-prompt.md) の think-before-act)

続けて:

```
映画
```

今度は LLM がジャンル等を聞いてくるか、具体的なおすすめを返すか、モデル次第。

何ターンか続けたあと:

```
ありがとう、参考になった
```

LLM が `end_chat` ツールを呼んで会話が自動終了するはず:

```
[chat ended by agent: conversation complete]
```

これが [theory 06 エージェントループ](../theory/06-agent-loop.md) の「明示的な終了シグナル」の実機。

### 9. 対話モードのトレースを Sessions で見る

Langfuse の **Sessions** タブを開くと、今の対話が 1 つの session としてまとまっている (`agent-chat-xxxxxxx`)。

中を開くと、各ターン (= 1 つの `LangGraph` trace) が時系列で並び、全体のターン数 / 総コスト / 総 duration が 1 画面で見える。これが [theory 04](../theory/04-messages-state.md) で書いた「観測軸のグルーピング」として機能する瞬間。

### 10. `tags=agent-demo` で絞り込み

Traces タブに戻って、フィルタに `tags` contains `agent-demo` を入れると、このハンズオンで作ったトレースだけが残る。本番では tag で環境 / 実験 / バージョンを切り分けるのと同じ要領 ([theory 08](../theory/08-observability.md))。

## 観察できた現象の対応章

| 観察 | 対応する座学 |
|---|---|
| ツール一覧の宣言 (tools スキーマ) | [05 Tool calling](../theory/05-tool-calling.md) |
| LLM がツールを呼ぶ判断 | [05 Tool calling](../theory/05-tool-calling.md) "決めるのは LLM" |
| 階層 span (LangGraph → ChatOpenAI → tool) | [08 Observability](../theory/08-observability.md) |
| 並列 tool_calls | [06 エージェントループ](../theory/06-agent-loop.md) |
| ツール絞り込みと LLM 能力の関係 | [05 Tool calling](../theory/05-tool-calling.md) "道具の品質" |
| 対話モードでの追加質問 (ツール呼ばず) | [13 system prompt の設計](../theory/13-system-prompt.md) |
| end_chat による自動終了 | [06 エージェントループ](../theory/06-agent-loop.md) "明示的な終了シグナル" |
| Sessions タブでの対話まとめ | [04 Messages と state](../theory/04-messages-state.md), [08 Observability](../theory/08-observability.md) |
