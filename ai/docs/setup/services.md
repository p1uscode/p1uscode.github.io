# サービス構成

## ディレクトリ構成

```
.
├── .env                    # 全サービス共通の設定 (バージョン・APIキー等、gitignore済)
├── .env.example            # .env のテンプレート
├── .mise.toml              # mise タスク定義 (.env を読み込み)
├── services/               # docker compose で動かすインフラ群
│   ├── traefik/                # リバースプロキシ
│   ├── dify/
│   │   ├── docker-compose.override.yaml  # difyのローカルカスタマイズ
│   │   └── dify/                          # git clone (管理外)
│   ├── litellm/                # LiteLLM プロキシ + mitmproxy
│   ├── open-webui/             # Open WebUI
│   ├── langfuse/               # Langfuse (LLM オブザーバビリティ)
│   ├── searxng/                # SearXNG (メタ検索エンジン)
│   ├── qdrant/                 # Qdrant (ベクトル DB)
│   └── n8n/                    # n8n (ワークフロー自動化)
├── examples/               # 学習用サンプルコード
│   └── agent-demo/             # LangChain ツールコールエージェント (Node/TS)
└── docs/                   # ドキュメント群 (setup / hands-on / theory)
```

バージョン・API キー・ホスト名などの設定値はすべてルートの `.env` に集約し、各サービスの `docker-compose.yml` は `env_file: ../../.env` で参照する。

## サービス一覧

全サービスは `proxy` Docker ネットワークで接続され、Traefik によって `*.home.arpa` のホスト名でルーティングされる。

| サービス | URL | 概要 |
|---|---|---|
| Traefik | <http://traefik.home.arpa> | リバースプロキシ兼ダッシュボード。全サービスの前段で動く。 |
| Dify | <http://dify.home.arpa> | LLM アプリ開発プラットフォーム。エージェント / RAG / プロンプト管理を GUI で組める大規模ツール。 |
| LiteLLM | <http://litellm.home.arpa> | OpenAI 互換 API で OpenAI / Anthropic / Gemini 等を束ねるプロキシ。モデル定義は `services/litellm/config.yaml`。Langfuse への callback 連携済み。 |
| mitmproxy | <http://mitmproxy.home.arpa> | LiteLLM のアウトバウンド通信を覗くデバッグ用中間プロキシ。 |
| Open WebUI | <http://open-webui.home.arpa> | チャット UI。LiteLLM を OpenAI 互換バックエンドとして自動接続。 |
| Langfuse | <http://langfuse.home.arpa> | LLM 呼び出しのトレース / コスト / レイテンシ / 評価の可視化。LiteLLM と agent-demo から自動でトレースが流れる。初期ユーザ: `admin@home.arpa` / `password`。 |
| SearXNG | <http://searxng.home.arpa> | 70+ エンジン (Google/Brave/DuckDuckGo/Wikipedia 等) を束ねるメタ検索。JSON API を有効化して agent-demo の検索ツールが叩く。 |
| Qdrant | <http://qdrant.home.arpa> | スタンドアロンのベクトル DB。Dify の内蔵ストアと切り離して RAG の retrieval 段を手で組む学習用。 |
| n8n | <http://n8n.home.arpa> | ビジュアルワークフロー自動化。LangChain ベースの AI Agent ノードを持つ。初回アクセス時にオーナーアカウント作成。 |

## 利用可能モデル (LiteLLM 経由)

| プロバイダー | モデル |
|---|---|
| OpenAI | gpt-4.1, gpt-4.1-mini, gpt-4o, o3, o4-mini |
| Anthropic | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 |
| Google | gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash |
