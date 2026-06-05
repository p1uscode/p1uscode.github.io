# AI 理解度ステップ (座学)

現代の LLM エージェントが内部で何をしているかを、理解するための独立資料群。各ファイルは 5 〜 10 分で読めるサイズを目安。

## Layer 1: 見取り図

| # | トピック | 内容 |
|---|---|---|
| 01 | [登場人物と責任範囲](01-overview.md) | LLM / エージェント / ツール / ガード / 人 の関係図と、LLM 単体の限界 (日時 / 天気 / 計算 等)  |

## Layer 2: LLM 1 呼び出しの中身

| # | トピック | 内容 |
|---|---|---|
| 02 | [LLM の 1 回の呼び出し](02-llm-call.md) | `POST /v1/chat/completions` の request / response、role、usage の見方、ステートレスであること |
| 03 | [トークンとコンテキストウィンドウ](03-tokens-context.md) | トークン化、context window、日本語/英語の差、料金、上限との付き合い方 |

## Layer 3: 状態とツール

| # | トピック | 内容 |
|---|---|---|
| 04 | [Messages と state](04-messages-state.md) | messages 配列の構造、4 つの role の意味、1 ターンの定義、state = messages 配列、永続化の選択肢、Langfuse session は state ではないこと |
| 05 | [Tool calling (function calling)](05-tool-calling.md) | LLM は決めるだけ / 叩くのはエージェント、tools スキーマと `tool_calls` の往復、道具の品質、ツール呼出は約束でしかない |
| 06 | [MCP (Model Context Protocol)](06-mcp.md) | ツール / データ / プロンプトを LLM に繋ぐ共通インターフェース、4 プリミティブ (tools / resources / prompts / sampling)、3 層アーキテクチャ、メリットとリスク |
| 07 | [エージェントループ](07-agent-loop.md) | 1 ターン = N イテレーション、5 つの停止条件、並列 tool_calls、無限ループ対策、2 層ループ |

## Layer 4: 記憶と永続化

| # | トピック | 内容 |
|---|---|---|
| 08 | [記憶の多層モデル](08-memory.md) | モデル重み / プロンプトキャッシュ / 会話履歴の再送 / md ファイル / 外部ストレージの 5 層、「記憶」に見える仕組みの切り分け |

## Layer 5: Observability / RAG / 評価

| # | トピック | 内容 |
|---|---|---|
| 09 | [Observability / tracing](09-observability.md) | trace と span の基本、親子関係の伝搬、Langfuse の実装 3 層、sessionId / userId / tags / metadata の使い分け、観測 ≠ 記憶 |
| 10 | [埋め込みと近傍検索](10-embeddings.md) | embedding 空間、cosine / dot product / L2、ANN (HNSW 等)、ベクトル DB の役割、埋め込みの限界 |
| 11 | [RAG の基本](11-rag.md) | Retrieval → Augmentation → Generation、チャンク設計、ハイブリッド検索、re-rank、agentic RAG パターン、引用と failure mode |
| 12 | [評価 (LLM-as-a-judge)](12-evaluation.md) | 4 つの評価軸 (決定論 / 参照一致 / LLM judge / 人手)、データセット作成、Langfuse の実務フロー、回帰テスト、メトリクス設計 |

## Layer 6: サンプリング / プロンプト設計 / 安全性

| # | トピック | 内容 |
|---|---|---|
| 13 | [サンプリングパラメータ](13-sampling.md) | `temperature` / `top_p` / `top_k` / `seed` / `max_tokens` / `stop` / 推論モデル固有パラメータ、決定性と多様性のトレードオフ、実践的な注意 |
| 14 | [system prompt の設計](14-system-prompt.md) | 基本 5 原則、典型パターン 4 種、アンチパターン、改善ワークフロー、プロンプトテンプレート管理 |
| 15 | [ガードとプロンプトインジェクション](15-guards.md) | インジェクションの種類 (直接 / 間接 / tool 結果 / jailbreak)、ガード 4 層 (入力 / tool_calls / 結果 / 出力)、信頼境界、根本的な限界 |

## Layer 7: 深掘り / モダリティ拡張 / 統合視点 (応用編)

| # | トピック | 内容 |
|---|---|---|
| 16 | [LLM の仕組み (ざっくり)](16-llm-internals.md) | 次トークン予測、transformer / self-attention、pretraining / instruction tuning / RLHF、hallucination の原因、推論モデルの仕組み、量子化 / 蒸留 |
| 17 | [マルチモーダルと他のモデル](17-multimodal.md) | VLM / ASR / TTS / 画像生成 / 動画生成 / 埋め込み / omni-modal、マルチモーダルエージェントでの扱い、公式「エージェント = モデル + ツール + state」が変わらない確認 |
| 18 | [エンジニアリングの 3 層](18-engineering-layers.md) | プロンプト / コンテキスト / ハーネス エンジニアリングの区別、既存章との対応表、改善アプローチの違い、agent-demo の各要素マッピング、よくある罠 |
| 19 | [ローカル LLM とクラウド LLM](19-local-vs-cloud-llm.md) | 2 つの選択肢、モデル形式 / ランタイム / 量子化 / ハード要件、クラウド課金 / レート制限 / retention、評価軸、使い分けの実務パターン |
| 20 | [主要 AI ツールの全体像](20-ai-tools-overview.md) | LLM ベンダー純正 (Claude / ChatGPT / Gemini / Grok) × 配信形態 (Web / App / CLI) / サードパーティ (エディタ / ターミナル / 検索 / UI / ワークフロー / 観測 / フレームワーク / ローカル)、評価軸 |
| 21 | [全体の締めくくり](21-closing.md) | 01-21 章の振り返り、この知識で何ができるか、これから先の進み方 |
