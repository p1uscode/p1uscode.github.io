# 初期設定

## 起動までの手順

```sh
cp .env.example .env
vi .env                # API キー等を記入
mise run setup         # dify clone + proxy ネットワーク作成
mise run up            # 全サービス起動
```

DNS 設定 (`*.home.arpa` の解決) が未済の場合は先に [DNS 設定](dns.md) を済ませること。mise の基本的な使い方を知らない場合は [mise の使い方](mise.md) を先に読むと理解しやすい。

初回実行時に mise が `.mise.toml` の trust を求めてきたら `mise trust` で承認する (`examples/agent-demo/` のネスト config を使う際も同様)。

個別の up/down、イメージ更新、dify のバージョン切り替えなどのタスクは `.mise.toml` を参照 (`mise tasks` で一覧)。

## .env の主な項目

| セクション | 項目 | 用途 |
|---|---|---|
| versions | `DIFY_TAG`, `TRAEFIK_VERSION`, `LITELLM_VERSION`, `MITMPROXY_VERSION`, `OPEN_WEBUI_VERSION`, `LANGFUSE_VERSION`, `SEARXNG_VERSION`, `QDRANT_VERSION`, `N8N_VERSION` | イメージ / git tag の固定 |
| dify | `TRAEFIK_HOST`, `NGINX_PORT` | dify override 用 |
| litellm | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | モデルプロバイダ認証 |
| mitmproxy | `MITMPROXY_WEB_PASSWORD` | mitmweb のログイン |
| open-webui | `OPENAI_API_BASE_URL`, `OLLAMA_BASE_URL`, `WEBUI_SECRET_KEY` | 接続先 / 暗号鍵 |
| langfuse | `LANGFUSE_POSTGRES_PASSWORD`, `LANGFUSE_CLICKHOUSE_PASSWORD`, `LANGFUSE_REDIS_PASSWORD`, `LANGFUSE_MINIO_PASSWORD`, `LANGFUSE_SALT`, `LANGFUSE_ENCRYPTION_KEY`, `LANGFUSE_NEXTAUTH_SECRET`, `LANGFUSE_INIT_*`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` | DB 認証 / 暗号化 / 初期プロビジョニング / LiteLLM 連携 |
| searxng | `SEARXNG_SECRET` | クッキー署名鍵 |
| qdrant | `QDRANT_API_KEY` | API アクセス認証 |
| n8n | `N8N_ENCRYPTION_KEY` | workflow credentials の暗号化 |

バージョンを上げたいときは `.env` の該当値を書き換えて `mise run update` → `mise run up`。
