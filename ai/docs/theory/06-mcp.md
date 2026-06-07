# MCP (Model Context Protocol)

[前章](05-tool-calling.md) で「ツールは LLM の手足で、`description` / `schema` / `impl` の 3 要素で決まる」と見た。では**そのツールを、どのエージェントからでも使い回せる形で配るには**どうするか。その標準が **MCP (Model Context Protocol)** で、Anthropic が提唱した**オープン仕様** ([spec.modelcontextprotocol.io](https://spec.modelcontextprotocol.io))。

ひとことで言うと、**LLM に対してツール・データ・プロンプトを標準化された方法で接続するための共通インターフェース**。よく「**AI のための USB-C**」と例えられる。USB-C が「どのデバイスでも同じ口で繋がる」ように、MCP は「どのエージェントからでも同じ口でツール群を繋げる」。

## なぜ必要か — function calling だけでは何が困るか

[第 5 章](05-tool-calling.md) の tool calling は「1 つのエージェントの中で LLM に道具を渡す」仕組みだった。これだけだと:

- ツールの実装が**エージェントごとに個別**。Claude Code 用に書いた GitHub 連携を Cursor で使い回せない
- 配布の標準が無い。「このツール群を入れて」と言われても各ホストで別々に組み込む必要がある
- ツール (関数呼び出し) しか標準化されていない。**読み取り専用データ**や**再利用テンプレート**を渡す共通の語彙が無い

MCP はここを「**サーバを 1 個立てれば、対応する全ホストから同じツール群が見える**」形に標準化する。

## 3 層アーキテクチャ

MCP は **HOST / CLIENT / SERVER** の 3 層で構成される。

```
┌─────────────── HOST (Claude Desktop / IDE / Agent ランタイム) ───────────────┐
│  ユーザと LLM を抱える本体。複数の MCP サーバに繋ぐ                          │
│                                                                              │
│   ┌── MCP CLIENT ──┐   ┌── MCP CLIENT ──┐   ┌── MCP CLIENT ──┐              │
│   │ (server ごと   │   │  1 接続)       │   │                │              │
│   └───────┬────────┘   └───────┬────────┘   └───────┬────────┘              │
└───────────┼────────────────────┼────────────────────┼───────────────────────┘
            │ JSON-RPC 2.0        │                    │
            ▼                     ▼                    ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │ SERVER (local)  │  │ SERVER (SaaS)   │  │ SERVER (社内自前) │
   │ filesystem 等   │  │ github / notion │  │ company-db 等    │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
```

- **HOST**: ユーザと LLM を持つ本体。Claude Desktop / IDE / 自作 Agent ランタイムなど
- **MCP CLIENT**: HOST の中に**サーバ 1 つあたり 1 接続**で立つ。サーバとの通信を担当
- **MCP SERVER**: ツール・データ・プロンプトを実際に提供する側

通信は **JSON-RPC 2.0**。トランスポートは 3 種類:

| トランスポート | 用途 |
|---|---|
| **stdio** | ローカルプロセスを起動して標準入出力で話す。最も手軽 |
| **SSE** (Server-Sent Events) | HTTP でサーバ→クライアントへストリーム。リモートサーバ向け |
| **streamable HTTP** | 双方向の HTTP ストリーム。SSE の後継的な位置づけ |

接続時は handshake (`initialize` → capabilities 交換 → `tools/list` 等で一覧取得 → `tools/call` で実行 → notifications で変更通知) という流れで進む。

## 4 つのプリミティブ

MCP サーバが提供できるものは tools だけではない。**4 種類のプリミティブ**がある。ここが「単なる function calling の配布規格」を超えている部分。

| プリミティブ | 中身 | [第 5 章](05-tool-calling.md) との関係 |
|---|---|---|
| **tools** | LLM が呼べる関数。**副作用あり**。JSON Schema で引数を定義 | tool calling の `tools` そのもの |
| **resources** | **読み取り専用データ**。`file://` `git://` `db://` のような URI で指す | context 注入の素材 ([第 8 章](08-memory.md) の L4/L5 に近い) |
| **prompts** | サーバ側で名前付き定義した**再利用可能テンプレート** | system prompt / few-shot の配布 ([第 14 章](14-system-prompt.md)) |
| **sampling** | **サーバ→ホストへの逆方向 LLM 呼び出し**。サーバが自前で LLM を持たずホストの LLM を借りる | — (MCP 独自) |

`sampling` が面白い。通常は「ホスト → サーバ」へツールを呼ぶ向きだが、sampling は逆向き。サーバ側のロジックが「ここで LLM に要約させたい」と思ったとき、ホストの LLM を借りられる。サーバが独自に API キーやモデルを抱えなくてよくなる。

## サーバの 3 つの形態

同じ MCP でも、サーバがどこで動くかで認証・隔離の考え方が変わる。

| 形態 | 例 | トランスポート | 認証 / 隔離 |
|---|---|---|---|
| **ローカル (stdio)** | `filesystem-mcp` を `npx` / `uvx` / `docker` で起動 | stdio | プロセス境界で隔離。**手元マシンの権限で動く** |
| **SaaS (HTTP / SSE)** | github / notion / linear | SSE / streamable HTTP | **OAuth 2.0** + scope (read / write) |
| **社内自前** | `company-db-mcp` | HTTP | API key / mTLS、ネットワーク境界の内側 |

結果として、**同じ MCP サーバを Claude Desktop でも Cursor でも Cline でも自作 Agent でも使い回せる**。ホストごとに独自のプラグイン API を作らなくてよくなる、というのが最大の効能。

## メリットとリスク

新しい標準はいいことばかりではない。導入判断のために両面を押さえる。

### メリット

- **ホスト非依存**: 同じサーバを Claude / Cursor / Cline / 自作 Agent で共有できる
- **パッケージ配布**: npm / pip / docker で配って、設定 JSON にエントリを足すだけで接続
- **tools 以外の語彙**: resources / prompts / sampling まで標準化。function calling より扱える範囲が広い
- **認証・認可の標準**: SaaS は OAuth 2.0 で認証し scope で read-only / read-write を分けられる
- **混在できる**: ローカル / SaaS / 社内自前を同じ抽象で扱い、トランスポートを切り替えるだけ

### リスク

- **tool 爆発**: 10 サーバ × 10 tools = **100 個の description が毎リクエストに乗る**。[第 3 章](03-tokens-context.md) のコンテキスト圧迫そのもの。LLM の選択精度も落ちる
- **prompt injection の経路**: サードパーティの `description` を信用する構造なので、悪意あるツール説明文が**指示注入**の入り口になる ([第 15 章](15-guards.md))
- **ローカル stdio = 任意コード実行**: 手元マシンの権限で動くので、サンドボックス無しだと実質「任意コード実行」と等価。出所不明のサーバを繋ぐのは危険 ([第 19 章](19-local-vs-cloud-llm.md) のツール層セキュリティ)
- **過剰権限**: SaaS の scope 設計が粗いと「issue 操作は OK だが repo 削除は NG」のような細かい制御ができない
- **仕様が流動的**: 2026 年時点でエコシステムは未成熟。互換性・監査・課金・マルチテナント周りはまだ発展途上

実務的には、**手元の開発ではローカル MCP を積極的に使い、本番エージェントでは認可境界とコンテキスト圧迫を見て厳選する**、というのが落とし所になる。

## function calling と MCP の関係

混同しやすいが、両者は競合しない。**MCP は function calling を置き換えるものではなく、その上にある配布・接続レイヤ**。

```
[LLM] ──tool calling ([第 5 章])── [エージェント] ──MCP── [MCP サーバ群]
        LLM が「呼んで」と JSON で表明      ホストが MCP 経由でツールを集めて
                                          LLM に tools として提示する
```

LLM 自身は MCP を知らない。LLM から見えるのは相変わらず [第 5 章](05-tool-calling.md) の `tools` 配列だけ。MCP サーバから集めたツール群を、ホストが function calling の `tools` 形式に変換して LLM に渡している。**「決めるのは LLM、叩くのはエージェント」**の構図は変わらず、その「叩く」先が MCP サーバになっただけ。

## agent-demo との対応

本リポジトリの `examples/agent-demo/` は **MCP を使っていない**。ツールは `tools.ts` に LangChain ネイティブの `tool()` で直接定義している ([第 5 章](05-tool-calling.md) の形)。これは「ツール 1 個の中身」を理解するには最短だが、配布・再利用はできない。

MCP に寄せるなら:

- `search` / `fetch_url` 等を **MCP サーバとして切り出す**と、Claude Desktop や Cursor からも同じツールが使える
- ローカルの Qdrant ([第 8 章](08-memory.md) L5) を `resources` として公開すれば、読み取り専用データを標準 URI で参照できる
- ただし学習用途では「ツールの中身が手元で全部見える」LangChain 直書きの方が分かりやすいので、agent-demo はあえて MCP を使っていない

本リポジトリの周辺では、**Dify / n8n** のようなツールが MCP ホスト / クライアントを取り込みつつある。エコシステムの動きは [第 20 章](20-ai-tools-overview.md) も参照。

## まとめ

- **MCP = ツール / データ / プロンプトを LLM に繋ぐ共通インターフェース** (Anthropic 提唱のオープン仕様、「AI の USB-C」)
- **3 層**: HOST → MCP CLIENT (server ごとに 1 接続) → SERVER。通信は **JSON-RPC 2.0**、トランスポートは stdio / SSE / streamable HTTP
- **4 プリミティブ**: tools (副作用あり関数) / resources (読み取り専用データ) / prompts (再利用テンプレート) / sampling (サーバ→ホストの逆 LLM 呼び出し)
- **サーバ 3 形態**: ローカル stdio / SaaS (OAuth 2.0) / 社内自前 (API key・mTLS)
- **メリット**: ホスト非依存・パッケージ配布・tools 以外の語彙・認可標準・混在可能
- **リスク**: tool 爆発・prompt injection 経路・ローカル stdio の任意コード実行・過剰権限・仕様の流動性
- **function calling の置き換えではなく、その上の配布レイヤ**。LLM から見えるのは相変わらず `tools` 配列だけ

## さらに深掘りするなら

- [MCP 公式仕様](https://spec.modelcontextprotocol.io) — プリミティブとトランスポートの正確な定義
- [第 5 章 Tool calling](05-tool-calling.md) — MCP が配布する「ツール 1 個」の中身
- [第 15 章 ガード](15-guards.md) — サードパーティ description を信用することの危険
- [第 19 章 ローカル LLM とクラウド LLM](19-local-vs-cloud-llm.md) — ツール層のセキュリティ境界
