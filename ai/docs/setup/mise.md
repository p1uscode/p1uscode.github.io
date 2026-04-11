# mise の使い方 (ざっくり)

[mise](https://mise.jdx.dev/) は **Node / Python / Go 等の開発ツールのバージョン管理** + **プロジェクト固有のタスクランナー** + **環境変数ローダー** を 1 つにまとめたツール。本リポジトリでは docker 系のタスクやエージェント実行をすべて mise のタスクで定義しており、コマンド実行の入り口はほぼ `mise run ...` に統一されている。

> ここは「知らない人がざっと理解する」ための資料で、mise の本質を語るものではない。詳細は公式ドキュメントを参照。

## インストール

```sh
# Homebrew の場合
brew install mise

# シェル連携 (zsh の例)
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
```

## 主なコマンド

| コマンド | 用途 |
|---|---|
| `mise tasks` | この場所で使えるタスク一覧 |
| `mise run <name>` | タスクを実行 (例: `mise run up`) |
| `mise run <name> -- <args>` | タスクに引数を渡す |
| `mise install` | `.mise.toml` の `[tools]` に書かれたツール (node 等) を実際にインストール |
| `mise trust` | 新しい `.mise.toml` を信頼する (初回のみ必要) |
| `mise env` | 現在ロードされている環境変数を表示 |
| `mise exec -- <cmd>` | mise の env / tools を load した状態で任意のコマンドを実行 |

## このリポジトリでの使われ方

### `.mise.toml` が 2 箇所にある

```
.
├── .mise.toml              # ルート: docker compose 系のタスク + .env ロード
└── examples/
    └── agent-demo/
        └── .mise.toml      # ネスト: Node のバージョン指定 + 自分の .env ロード
```

mise は **カレントディレクトリから親方向に config ファイルを walk up** して全て合成するため、`examples/agent-demo/` の中に `cd` してから `mise run up:langfuse` のように root のタスクを叩くこともできる (逆も可)。

### 環境変数のロード

`[env]` セクションで `.env` ファイルを指定できる:

```toml
# ルートの .mise.toml
[env]
_.file = ".env"
```

これにより、`mise run <任意のタスク>` するとき `.env` の中身がシェル環境変数として export され、docker compose や各種スクリプトがそのまま参照できる。

### ツールのバージョン固定

`[tools]` セクションで言語ランタイムや CLI を宣言:

```toml
# examples/agent-demo/.mise.toml
[tools]
node = "24.14.1"
```

この状態で `mise install` すると node 24.14.1 が mise 管理下にインストールされ、該当ディレクトリ配下では自動的に `node`/`npx` などがこのバージョンになる。

### タスクの書き方 (抜粋)

```toml
[tasks."up:langfuse"]
description = "Start langfuse (LLM observability)"
run = "docker compose -f services/langfuse/docker-compose.yml up -d"

[tasks.up]
description = "Start all services"
depends = ["up:traefik", "up:dify", "up:litellm", "up:open-webui", "up:langfuse", "up:searxng", "up:qdrant", "up:n8n"]

[tasks.agent-single]
description = "Run the LangChain agent demo (single-shot; pass prompt as args after --)"
dir = "examples/agent-demo"
run = "mise exec -- npx tsx src/agent-single.ts"
```

- `depends` で他タスクを前提にできる (並列 up などに使う)
- `dir` で作業ディレクトリを切り替えられる
- `run` に任意のシェルコマンドが書ける

## 良くあるトラブル

| 現象 | 対処 |
|---|---|
| `mise ERROR ... are not trusted` | `mise trust` で承認する |
| `mise run` したのに `.env` の値が読まれない | `[env] _.file = ".env"` が書かれているか、該当 config が trust されているか確認 |
| `mise run` でタスクが見えない | 今いるディレクトリが `.mise.toml` の置かれた場所の配下か確認 (`mise tasks` で確認) |
| `mise install` したが `node` のパスがおかしい | `eval "$(mise activate zsh)"` がシェル起動スクリプトに入っているか確認 |
