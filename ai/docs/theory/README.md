# AI 理解度ステップ (座学)

現代の LLM エージェント (Dify / agent-demo / Open WebUI など) が内部で何をしているかを、**下の層から順に積み上げて**理解するための独立資料群。各ファイルは 5 〜 10 分で読めるサイズを目安に、必要に応じて本リポジトリの実装 (`examples/agent-demo/` 等) を参照する。

## 進め方の選び方

本リポジトリの knowledge は 3 本立て:

| フォルダ | 位置付け | 内容 |
|---|---|---|
| [setup/](../setup/README.md) | 設定するだけ、ツールを起動する | インストール、`.env`、DNS、mise、Ollama、agent-demo のセットアップ |
| [hands-on/](../hands-on/README.md) | 実際に動かして観察する | Open WebUI でチャット、Langfuse でトレース、mitmproxy で生 API、agent-demo 実行、E2E 演習 |
| **theory/** (ここ) | **座学** | 仕組み / 原理 / 設計の独立資料 (本ファイル群、00-18 章) |

**どこから始めてもよい**:

- **座学 → ハンズオン 派**: まず章 00-18 で仕組みを理解してから、[hands-on/](../hands-on/README.md) に進む。「全体像を掴んでから手を動かしたい」人向け
- **ハンズオン → 座学 派**: [setup/](../setup/README.md) でサービスを立ち上げ、[hands-on/](../hands-on/README.md) で触りながら、気になったところで対応する章を開く。「動いているものを触りながら理解したい」人向け
- **並行派**: 章 00-02 (見取り図と LLM の基本) を座学で読み、その後はハンズオンで動かしつつ、気になった章を拾い読みする

各章は独立して読めるように書いてあるので、「下から順」に縛られる必要はない。ロードマップは**依存関係の目安**として使って、興味のあるところから掘ればよい。

## 読む順序 (ロードマップ)

下の層ほど「そもそも何が起きているか」、上の層ほど「その組み合わせで何を作るか」。

### Layer -1: 見取り図

| # | トピック | 内容 | 状態 |
|---|---|---|---|
| 00 | [登場人物と責任範囲](00-overview.md) | LLM / エージェント / ツール / ガード / 人 の関係図と、LLM 単体の限界 (日時 / 天気 / 計算 等) を示すクイズ | ✅ |

### Layer 0: LLM 1 呼び出しの中身

| # | トピック | 内容 | 状態 |
|---|---|---|---|
| 01 | [LLM の 1 回の呼び出し](01-llm-call.md) | `POST /v1/chat/completions` の request / response、role、usage の見方、ステートレスであること | ✅ |
| 02 | [トークンとコンテキストウィンドウ](02-tokens-context.md) | トークン化、context window、日本語/英語の差、料金、上限との付き合い方 | ✅ |

### Layer 1: 状態とツール

| # | トピック | 内容 | 状態 |
|---|---|---|---|
| 03 | [Messages と state](03-messages-state.md) | messages 配列の構造、4 つの role の意味、1 ターンの定義、state = messages 配列、永続化の選択肢、Langfuse session は state ではないこと | ✅ |
| 04 | [Tool calling (function calling)](04-tool-calling.md) | LLM は決めるだけ / 叩くのはエージェント、tools スキーマと `tool_calls` の往復、道具の品質、ツール呼出は約束でしかない | ✅ |
| 05 | [エージェントループ](05-agent-loop.md) | 1 ターン = N イテレーション、5 つの停止条件、並列 tool_calls、無限ループ対策、2 層ループ | ✅ |

### Layer 2: 記憶と永続化

| # | トピック | 内容 | 状態 |
|---|---|---|---|
| 06 | [記憶の多層モデル](06-memory.md) | プロンプトキャッシュ / 会話履歴の再送 / 外部ストレージ等、「記憶」に見える仕組みのレイヤー | ✅ |

### Layer 3: Observability / RAG / 評価

| # | トピック | 内容 | 状態 |
|---|---|---|---|
| 07 | [Observability / tracing](07-observability.md) | trace と span の基本、親子関係の伝搬、Langfuse の実装 3 層、sessionId / userId / tags / metadata の使い分け、観測 ≠ 記憶 | ✅ |
| 08 | [埋め込みと近傍検索](08-embeddings.md) | embedding 空間、cosine / dot product / L2、ANN (HNSW 等)、ベクトル DB の役割、埋め込みの限界 | ✅ |
| 09 | [RAG の基本](09-rag.md) | Retrieval → Augmentation → Generation、チャンク設計、ハイブリッド検索、re-rank、agentic RAG パターン、引用と failure mode | ✅ |
| 10 | [評価 (LLM-as-a-judge)](10-evaluation.md) | 4 つの評価軸 (決定論 / 参照一致 / LLM judge / 人手)、データセット作成、Langfuse の実務フロー、回帰テスト、メトリクス設計 | ✅ |

### Layer 4: サンプリング / プロンプト設計 / 安全性

| # | トピック | 内容 | 状態 |
|---|---|---|---|
| 11 | [サンプリングパラメータ](11-sampling.md) | `temperature` / `top_p` / `top_k` / `seed` / `max_tokens` / `stop` / 推論モデル固有パラメータ、決定性と多様性のトレードオフ、実践的な注意 | ✅ |
| 12 | [system prompt の設計](12-system-prompt.md) | 基本 5 原則、典型パターン 4 種、アンチパターン、改善ワークフロー、プロンプトテンプレート管理 | ✅ |
| 13 | [ガードとプロンプトインジェクション](13-guards.md) | インジェクションの種類 (直接 / 間接 / tool 結果 / jailbreak)、ガード 4 層 (入力 / tool_calls / 結果 / 出力)、信頼境界、根本的な限界 | ✅ |

### Layer 5: 深掘り / モダリティ拡張 / 統合視点 (応用編)

ここまでは「LLM を使う側」の視点で 1 層ずつ積み上げてきた。以下 5 章は「内部 / 横への拡張 / 視点の統合 / 配置 / エコシステム」でこれまでの知識を別角度から締める。

| # | トピック | 内容 | 状態 |
|---|---|---|---|
| 14 | [LLM の仕組み (ざっくり)](14-llm-internals.md) | 次トークン予測、transformer / self-attention、pretraining / instruction tuning / RLHF、hallucination の原因、推論モデルの仕組み、量子化 / 蒸留 | ✅ |
| 15 | [マルチモーダルと他のモデル](15-multimodal.md) | VLM / ASR / TTS / 画像生成 / 動画生成 / 埋め込み / omni-modal、マルチモーダルエージェントでの扱い、公式「エージェント = モデル + ツール + state」が変わらない確認 | ✅ |
| 16 | [エンジニアリングの 3 層](16-engineering-layers.md) | プロンプト / コンテキスト / ハーネス エンジニアリングの区別、既存章との対応表、改善アプローチの違い、agent-demo の各要素マッピング、よくある罠 | ✅ |
| 17 | [ローカル LLM とクラウド LLM](17-local-vs-cloud-llm.md) | 2 つの選択肢、モデル形式 / ランタイム / 量子化 / ハード要件、クラウド課金 / レート制限 / retention、評価軸、使い分けの実務パターン、homelab のハイブリッド設計 | ✅ |
| 18 | [主要 AI ツールの全体像](18-ai-tools-overview.md) | LLM ベンダー純正 (Claude / ChatGPT / Gemini / Grok) × 配信形態 (Web / App / CLI) / サードパーティ (エディタ / ターミナル / 検索 / UI / ワークフロー / 観測 / フレームワーク / ローカル)、評価軸、homelab の立ち位置 | ✅ |
| 19 | [全体の締めくくり](19-closing.md) | 00-18 章の振り返り、この知識で何ができるか、これから先の進み方 | ✅ |
