# ai

ローカルで動く AI スタック (LLM / エージェント / 観測 / RAG / マルチモーダル) を題材に、**仕組みを手を動かして理解する**。

- **services/** — LiteLLM / Langfuse / Open WebUI / Dify / Qdrant / mitmproxy 等のセルフホスト AI スタック (Docker Compose)
- **examples/agent-demo/** — tool calling エージェントの最小実装。Langfuse にトレースが流れる
- **setup / hands-on / theory** — 3 本立てドキュメント

タスク実行は [mise](https://mise.jdx.dev/) に集約してある。

> **コマンドは `.mise.toml` を正とする。** 個別タスクの一覧は `mise tasks`、詳細は `.mise.toml` を直接参照。

## ドキュメント

**ハンズオンは setup 完了が前提**。座学 (theory) は単独で読める。

| フォルダ | 位置付け | 前提 |
|---|---|---|
| [setup/](setup/README.md) | **セットアップ** (設定してツールを起動する) | なし |
| [hands-on/](hands-on/README.md) | **ハンズオン** (画面を触って動作を観察する) | setup の完了 |
| [theory/](theory/README.md) | **座学** (仕組み / 原理 / 設計の独立資料、01-20 章) | なし (単独で読める) |

**典型的な進め方**:

- **動かしながら学ぶ**: setup → hands-on → (気になった所で) theory
- **仕組みから学ぶ**: theory を章順 or 拾い読み → setup → hands-on
- **並行**: 章 01-03 (見取り図と LLM 1 呼び出しの基本) だけ先に読み、setup + hands-on に進む

### セットアップ (`setup/`)

インストールと構成リファレンス。`mise run up` まで辿り着くための手引き。

- [サービス構成](setup/services.md) — ディレクトリ構成、サービス一覧、利用可能モデル
- [初期設定](setup/bootstrap.md) — 起動手順、`.env` の主な項目
- [mise の使い方](setup/mise.md) — タスクランナー + 環境変数ローダーとしての mise
- [DNS 設定](setup/dns.md) — `*.home.arpa` の名前解決 (`/etc/hosts` / dnsmasq)
- [Ollama (ホスト側導入)](setup/ollama.md) — ローカル LLM ランタイム (クラウド LLM のみ使うなら不要)

### ハンズオン (`hands-on/`)

セットアップが終わった状態から、実際に画面や CLI を触って動作を観察する演習集。[目次](hands-on/README.md)。

- [1. Open WebUI でチャット](hands-on/open-webui.md) — 複数モデル切替、LLM 単体の限界体感
- [2. Langfuse でトレースを読む](hands-on/langfuse-traces.md) — Traces / Sessions / Dashboard の読み方
- [3. mitmproxy で生の LLM 通信を覗く](hands-on/mitmproxy.md) — プロバイダネイティブ API 形式の確認
- [4. agent-demo を動かす](hands-on/agent-demo.md) — 単発 / 対話 / ツール絞り込み / モデル切替
- [5. End-to-end で 1 つの質問を追う](hands-on/end-to-end.md) — 全レイヤ横断の総合演習

### 座学 (`theory/`)

LLM エージェントの内部を下の層から順に理解するための独立資料群。詳細な目次とロードマップは [theory/README.md](theory/README.md) を参照。

- [01 登場人物と責任範囲](theory/01-overview.md) — LLM / エージェント / ツール / ガード / 人 の関係図と、LLM 単体の限界 (日時・天気・計算 等)
- [02 LLM の 1 回の呼び出し](theory/02-llm-call.md) — Chat Completions API の中身、role、usage、ステートレス性、OpenAI 互換がデファクト
- [03 トークンとコンテキストウィンドウ](theory/03-tokens-context.md) — BPE トークン化、日本語/英語の差、context window 上限、超過との付き合い方
- [04 Messages と state](theory/04-messages-state.md) — messages 配列 = エージェントの state、永続化の選択肢、Langfuse session は state ではないこと
- [05 Tool calling (function calling)](theory/05-tool-calling.md) — LLM は決めるだけ / 叩くのはエージェント、tools スキーマと `tool_calls` の往復、道具の品質
- [06 エージェントループ](theory/06-agent-loop.md) — 1 ターン = N イテレーション、停止条件、並列 tool_calls、無限ループ対策
- [07 記憶の多層モデル](theory/07-memory.md) — プロンプトキャッシュ / 履歴再送 / 外部ストレージ等の「記憶」の実体
- [08 Observability / tracing](theory/08-observability.md) — trace と span、Langfuse 3 層実装、sessionId / userId / tags の使い分け、観測 ≠ 記憶
- [09 埋め込みと近傍検索](theory/09-embeddings.md) — embedding、cosine / dot product、ANN (HNSW 等)、ベクトル DB
- [10 RAG の基本](theory/10-rag.md) — Retrieval → Augmentation → Generation、チャンク設計、ハイブリッド、re-rank、agentic RAG
- [11 評価 (LLM-as-a-judge)](theory/11-evaluation.md) — 4 つの評価軸、データセット作成、回帰テスト、Langfuse 実務フロー
- [12 サンプリングパラメータ](theory/12-sampling.md) — temperature / top_p / seed / max_tokens、決定性と多様性
- [13 system prompt の設計](theory/13-system-prompt.md) — 基本 5 原則、典型パターン、アンチパターン、改善ワークフロー
- [14 ガードとプロンプトインジェクション](theory/14-guards.md) — インジェクションの種類、ガード 4 層、信頼境界、根本的な限界
- [15 LLM の仕組み (ざっくり)](theory/15-llm-internals.md) — 次トークン予測、transformer、3 段階学習、hallucination の原因、推論モデル
- [16 マルチモーダルと他のモデル](theory/16-multimodal.md) — VLM / ASR / TTS / 画像生成 / 動画生成 / omni-modal、エージェント骨格の普遍性
- [17 エンジニアリングの 3 層](theory/17-engineering-layers.md) — プロンプト / コンテキスト / ハーネス エンジニアリング、既存章との対応、agent-demo マッピング
- [18 ローカル LLM とクラウド LLM](theory/18-local-vs-cloud-llm.md) — 2 つの選択肢、量子化とハード要件、評価軸、ハイブリッドの実務パターン
- [19 主要 AI ツールの全体像](theory/19-ai-tools-overview.md) — LLM ベンダー純正 × サードパーティ × 配信形態、評価軸
- [20 全体の締めくくり](theory/20-closing.md) — 01-20 章の振り返りと、これから先の進み方
