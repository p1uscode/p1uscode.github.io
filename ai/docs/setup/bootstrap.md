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

## .env の設定

`.env.example` は 3 ブロックに分かれている。**最低限やるのは `[1/3] MUST SET` の API キー登録だけ**:

| 項目 | 用途 | 取得方法 |
|---|---|---|
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | LiteLLM が各プロバイダを呼ぶときの認証。**1 つ以上あれば動く** | 各プロバイダのキー発行画面から取得 |

`[2/3] OPTIONAL` は Langfuse / Open WebUI / SearXNG / Qdrant / n8n の各種 secret と、Langfuse の初期プロビジョニング値 (ユーザ / org / project)。**ローカル用途では既定値 (`password` / 0 埋めの hex) のまま動く**。本番 / 公開する場合はここを `openssl rand -hex 32` 等で置き換えること。Langfuse の `INIT_*` は DB が空のときだけ反映されるので、名前を変えたければ volume を消して再初期化が必要。

`[3/3] FIXED` はイメージバージョンとコンテナ間 URL。バージョンを上げたいときだけ該当値を書き換えて `mise run update` → `mise run up`。
