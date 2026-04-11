# agent-demo (セットアップとリファレンス)

`examples/agent-demo/` に Node.js + TypeScript + LangChain JS の最小エージェント実装が入っている。LiteLLM / Ollama 経由でモデルを呼び、ツールをループで呼び出し、**全ステップを Langfuse に親子付きの階層トレースとして送信**する。

> このページは**インストール / 設定 / 構成リファレンス**のみを扱う。実際に動かして観察する手順は [hands-on/agent-demo](../hands-on/agent-demo.md) を参照。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `examples/agent-demo/src/tools.ts` | ツール定義の集約 (`search` / `fetch_url` / `wikipedia` / `now` / `calc` / `random_int` / `end_chat`)。`selectTools()` が `AGENT_TOOLS` env を見て該当ツールだけ返す |
| `examples/agent-demo/src/setup.ts` | OTel + Langfuse / LLM / agent 生成 / 共通ヘルパを集約。モードごとの差分だけを 2 つのエントリポイントに残すための層 |
| `examples/agent-demo/src/agent-single.ts` | **単発モード**。CLI 引数を 1 回の `agent.invoke()` に渡して応答を出力して終了 |
| `examples/agent-demo/src/agent-chat.ts` | **対話モード**。`readline` で標準入力ループし、会話履歴を保持しながら複数ターンを繋ぐ。LLM が追加質問を返したときはそのままユーザ入力待ちに戻る。LLM が `end_chat` ツールを呼んだらループ正常終了 |

## 仕組み

- LangChain の `createAgent` でツールコールループを実装
- LLM は `ChatOpenAI` を LiteLLM or ホスト Ollama の OpenAI 互換エンドポイントに向けて叩く
- @langfuse/langchain の `CallbackHandler` + @langfuse/otel の `LangfuseSpanProcessor` + @opentelemetry/sdk-trace-node の `NodeTracerProvider` で、エージェントの各 LLM 呼び出し・各ツール呼び出しが親子スパンとして Langfuse に送信される
- Langfuse 接続先は Traefik 経由の `http://langfuse.home.arpa` (ホスト実行前提)

## 前提

SearXNG の JSON API が有効化されていること。`searxng_data` ボリューム内の `settings.yml` で `search.formats` に `json` が含まれている必要がある (無ければ `docker compose -f services/searxng/docker-compose.yml exec searxng vi /etc/searxng/settings.yml` で追加 → `mise run down:searxng && mise run up:searxng`)。

## インストール

初回のみ:

```sh
cd examples/agent-demo
mise install           # examples/agent-demo/.mise.toml の [tools] に従って node を入れる
cd -

mise run agent:ci      # npm ci (lockfile からの再現可能インストール)
```

依存を**追加/更新**したいときだけ `mise run agent:install` (= `npm install`) を使う。普段は `agent:ci` で OK。

## 設定項目 (agent-demo/.env)

| 変数 | 例 | 用途 |
|---|---|---|
| `AGENT_BACKEND` | `litellm` / `ollama` | LLM 接続先プリセット |
| `AGENT_MODEL` | `claude-sonnet-4-6` / `qwen3.5:35b` | モデル名 (backend デフォルトを上書き) |
| `AGENT_TOOLS` | `search,now,calc` | 有効ツール (未指定=全ツール) |
| `LLM_BASE_URL` | `http://...` | backend プリセットを無視して直接指定 |
| `SEARXNG_BASE_URL` | `http://searxng.home.arpa` | SearXNG エンドポイント |
| `AGENT_LANGFUSE_HOST` | `http://langfuse.home.arpa` | ホスト側から見える Langfuse URL (コンテナ用 `LANGFUSE_HOST` と別) |

Langfuse 資格情報 (`LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`) は root の `.env` に入っていればそのまま流用される。

## 利用可能ツール (tools.ts)

| ツール名 | 機能 |
|---|---|
| `search` | SearXNG でウェブ検索 (上位 5 件を JSON で返す) |
| `fetch_url` | URL を取得して HTML をストリップしたテキスト (3000 文字まで) を返す |
| `wikipedia` | 指定言語 (デフォルト 'ja') の Wikipedia 記事要約を REST API で取得 |
| `now` | 現在時刻 (ISO-8601 / UTC) |
| `calc` | 四則演算 (digits と `+ - * / ( )` のみ許可) |
| `random_int` | `[min, max]` 範囲の乱数整数 |
| `end_chat` | 対話モードで LLM が「会話はもう十分」と判断したときに呼ぶ終了シグナル。単発モードでは使わない |

ツール追加は `examples/agent-demo/src/tools.ts` に `tool()` で定義して `TOOLS` map に登録するだけ。

## 実行方法

2 つのモードがある:

- **単発モード** (`mise run agent-single -- "..."`): CLI 引数を 1 回だけ実行
- **対話モード** (`mise run agent-chat`): readline で multi-turn 対話

実際の使い方 / プロンプト例 / Langfuse での観察は [hands-on/agent-demo](../hands-on/agent-demo.md) を参照。
