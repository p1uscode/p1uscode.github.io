# 主要 AI ツールの全体像

ここまで学んだ知識 (0 章〜 17 章) を使って、**世の中の主要 AI ツールを整理**する。技術的な中身を一通り把握した後で全体像を眺めると、「このプロダクトは中身はこうなっている」「これは他とどう違う」が自分で判断できるようになる。

> **注記**: この章は **2026-04 時点のスナップショット**。プロダクトの顔ぶれ / 機能 / 価格は毎月変わる前提で読むこと。「分類軸」と「評価基準」の方が長く使える知識。

## 3 つの分類軸

AI ツールを整理する軸:

1. **提供元**: LLM ベンダー純正 (1st party) vs サードパーティ (3rd party)
2. **配信形態**: CLI / Web chat / Desktop app / Mobile app / Editor 組み込み / ワークフロー / フレームワーク / ローカル推論
3. **ターゲット用途**: 汎用チャット / コード / 検索 / ワークフロー自動化 / オブザーバビリティ

この 3 軸で各プロダクトを位置付けると見通しが良くなる。

## LLM ベンダー純正 (1st party)

主要 4 社の品揃えを横並びで比較:

| ベンダー | Web chat | Desktop / Mobile | CLI | API |
|---|---|---|---|---|
| **Anthropic** | Claude.ai | Claude Desktop (macOS/Windows) / iOS / Android | **Claude Code** | Anthropic API |
| **OpenAI** | ChatGPT | ChatGPT Desktop / iOS / Android | **Codex CLI** | OpenAI API |
| **Google** | Gemini | Gemini app (iOS / Android) / Gemini in Workspace | **Gemini CLI** | Gemini API |
| **xAI** | Grok (X 内 + grok.com) | Grok app | — | xAI API |

各形態の特徴:

- **Web chat**: 最も広いユーザ層の入口。無料枠あり。会話履歴の永続化、ファイルアップロード、Web 検索統合
- **Desktop / Mobile app**: Web chat の派生 + ネイティブ機能 (カメラ / マイク / スクリーンショット)
- **CLI**: 開発者向け。ターミナル統合、ファイル操作、コードベースを扱うエージェント。Claude Code は本リポジトリでも使われている
- **API**: 他ツールから叩く raw エンドポイント。全プロダクトの基盤

## サードパーティ製品 (3rd party)

カテゴリ別に整理する。

### (1) コードエディタ統合

| 製品 | 特徴 |
|---|---|
| **Cursor** | VS Code fork、AI ファースト、tab 補完 + multi-file edit |
| **Windsurf** | Cursor 同系、Cascade (自律エージェント) が特徴 |
| **GitHub Copilot** | エディタ非依存、Microsoft 系列、企業採用多数 |
| **Cody** (Sourcegraph) | コードベース検索に強い |
| **Continue** | OSS、エディタプラグイン、モデル切替可能 |
| **Tabnine** | エンタープライズ向け、オンプレ可 |

どれも**内部的には OpenAI 互換 API で複数モデルを切り替える**ことが多い。中身は LLM + tool calling + RAG (コードベース) + エージェントループの組み合わせで、章 02-10 の知識がそのまま通用する。

### (2) ターミナル系エージェント

| 製品 | 特徴 |
|---|---|
| **Claude Code** (Anthropic) | Anthropic 公式、対話式 + プラン + 自動実行 |
| **Codex CLI** (OpenAI) | OpenAI 公式、shell 統合 |
| **Gemini CLI** (Google) | Google 公式 |
| **GitHub Copilot CLI** | GitHub 公式、`gh copilot` サブコマンド、shell コマンド提案 / 説明に特化 |
| **OpenCode** (sst) | OSS、TUI、マルチプロバイダ (Anthropic / OpenAI / ローカル等)、provider 非依存の Claude Code 代替 |
| **Crush** (Charm) | OSS、Go 製 TUI、Bubble Tea ベース、軽量 |
| **Goose** (Block) | OSS、拡張機能 (MCP) ベース、デスクトップ + CLI |
| **Aider** (OSS) | OSS、git 連携、diff-first |
| **`llm`** (Simon Willison) | OSS、小さい Python CLI、パイプラインで使える |
| **Cline** / **Roo** (OSS) | VS Code 拡張 + ターミナル統合 |

共通点: **コードベースを読んで変更する** というエージェントユースケース。本リポジトリの `examples/agent-demo/` を本気で作り込むとこの辺りになる。

### (3) 検索特化チャット

| 製品 | 特徴 |
|---|---|
| **Perplexity** | 検索 + LLM、出典明示 |
| **Phind** | 開発者向け検索 |
| **You.com** | 汎用 AI 検索 |
| **Microsoft Copilot** | Bing 検索 + LLM |

共通点: RAG (Web 検索結果を context に注入) が核心。章 09 RAG の典型実装。

### (4) マルチモデル チャット UI

| 製品 | 特徴 |
|---|---|
| **T3 Chat** | 高速、複数モデル対応 |
| **Poe** (Quora) | 有料サブスクで各種モデル |
| **LibreChat** | OSS、セルフホスト可能 |
| **OpenRouter** | API プロキシ (複数モデルを 1 つのエンドポイントで) |
| **Chatbox** | OSS デスクトップアプリ |
| **Open WebUI** | **本リポジトリでも使用中**、セルフホストチャット UI |

共通点: 1 つの UI から複数 LLM 提供者にアクセスできる。**LiteLLM** (本リポジトリ) のようなプロキシレイヤと組み合わせるのが定石。

### (5) ワークフロー / ローコード自動化

| 製品 | 特徴 |
|---|---|
| **Dify** (**本リポジトリ**) | OSS、Visual LLM app builder、RAG / Agent / Workflow |
| **LangFlow** | OSS、LangChain のビジュアルエディタ |
| **Flowise** | OSS、LangChain ベース、軽量 |
| **n8n** (**本リポジトリ**) | OSS、汎用自動化、AI 系ノードが充実 |
| **Make** (旧 Integromat) | 商用 SaaS |
| **Zapier** | 商用 SaaS、最大の SaaS 連携数 |

共通点: 非エンジニアでもエージェント / RAG / ワークフローが組める GUI。内部では章 05-10 の仕組みを抽象化しているだけ。

### (6) オブザーバビリティ / 評価

| 製品 | 特徴 |
|---|---|
| **Langfuse** (**本リポジトリ**) | OSS、OTel ネイティブ、セルフホスト可能、[第 8 章](08-observability.md) で使用 |
| **LangSmith** (LangChain) | 商用、LangChain エコシステムと密結合 |
| **Phoenix** (Arize) | OSS、OTel ベース、評価機能あり |
| **Helicone** | プロキシ型 (リクエストを経由) |
| **Braintrust** | 評価特化、Eval harness が強力 |
| **PromptLayer** | プロンプト管理に特化 |

共通点: trace / span の可視化 + 評価データセット管理 + コスト/レイテンシ集計。章 07 / 10 の対応プロダクト。

### (7) 開発フレームワーク

| 製品 | 言語 | 特徴 |
|---|---|---|
| **LangChain** | Python / JS | 最大のエコシステム、本リポジトリの `agent-demo` で使用 |
| **LangGraph** | Python / JS | LangChain の状態マシン版、複雑なエージェント向け |
| **LlamaIndex** | Python / JS | RAG に特化 |
| **Haystack** | Python | RAG + パイプライン |
| **Pydantic AI** | Python | 型安全、シンプル |
| **Mastra** | TypeScript | TS ネイティブ、シンプル |
| **Vercel AI SDK** | TypeScript | Next.js 統合、ストリーミング UI |
| **Agents SDK** (OpenAI / Anthropic) | Python / TS | ベンダー純正の薄い SDK |

共通点: 章 04 tool calling / 05 エージェントループ / 03 state management を抽象化。どのフレームワークも根っこは同じ (第 17 章 ハーネス層)。

### (8) ローカル推論ランタイム

| 製品 | 特徴 |
|---|---|
| **Ollama** (**本リポジトリ**) | ユーザフレンドリー、モデル管理、OpenAI 互換 API |
| **LM Studio** | GUI ツール、Mac 向けに使いやすい |
| **llama.cpp** | 最軽量、C++、あらゆる環境 |
| **vLLM** | 高スループット、production 向け、NVIDIA GPU 必須 |
| **Text Generation Inference (TGI)** | HuggingFace 公式、NVIDIA GPU |
| **MLX** (Apple) | Apple Silicon 向け推論フレームワーク |

共通点: OSS モデル (Llama / Qwen / Gemma / Mistral 等) をローカル実行する。プライバシー / オフライン / コスト削減の用途で使う。

## 配信形態ごとの「何が得意か」

| 形態 | 典型ユーザ | 強み | 弱み |
|---|---|---|---|
| **Web chat** | 一般ユーザ | 導入不要、全プラットフォーム共通 | ローカルファイル / システムに触れない |
| **Mobile app** | 一般ユーザ | 音声・カメラ・常時携帯 | キーボード入力量が限定 |
| **Desktop app** | パワーユーザ | ネイティブ統合、ショートカット、ローカルファイル | Web chat との差別化が曖昧 |
| **CLI** | 開発者 | コードベース / git / シェル統合、スクリプト組込可 | 非開発者には敷居が高い |
| **エディタ組込** | 開発者 | 既存ワークフローに溶け込む、diff 提案 | エディタ依存 |
| **ローコードワークフロー** | オペレーション担当 | 非開発者でも組める、SaaS 連携豊富 | 複雑な分岐は破綻しがち |
| **API / フレームワーク** | エンジニア | 完全カスタム、任意 | 工数かかる |

## 「どれを使えばいいか」の目安

- **試すだけ / カジュアル**: Web chat (ChatGPT / Claude.ai / Gemini)
- **コードを書きたい**: エディタ統合 (Cursor / Windsurf) or CLI (Claude Code / Codex / Aider)
- **チーム / 業務で自動化**: Dify / n8n / LangFlow のローコード系
- **完全カスタム**: LangChain / LangGraph / Mastra / Vercel AI SDK で自作 (本リポジトリの `agent-demo` がこの例)
- **プライバシー / オフライン**: Ollama + Open WebUI (本リポジトリ構成)

## 本リポジトリの立ち位置

`ai/` + `ai/examples/agent-demo/` は、上のプロダクト群が**裏で使っている仕組みの最小実装**として位置付けられる。たとえば Cursor も Claude Code も Dify も n8n も、中身は:

- LLM 呼び出し ([第 2 章](02-llm-call.md))
- トークン / コンテキスト管理 ([第 3 章](03-tokens-context.md))
- messages / state 管理 ([第 4 章](04-messages-state.md))
- tool calling ([第 5 章](05-tool-calling.md))
- エージェントループ ([第 6 章](06-agent-loop.md))
- 記憶 / RAG ([第 06, 08, 09 章](07-memory.md))
- 観測 ([第 8 章](08-observability.md))
- 評価 ([第 11 章](11-evaluation.md))
- プロンプト / コンテキスト / ハーネス の 3 層 ([第 17 章](17-engineering-layers.md))

を組み合わせて製品化しただけ。**hands-on で学んだ知識はそのまま全プロダクトの理解に通じる**。逆に言うと、どれか 1 つに詳しくなっても本質は学べず、原理 (章 01-18) を押さえた上で全プロダクトを横断的に評価できるのが理想。

## プロダクト選びの評価軸

個別プロダクトを評価するときの普遍的な軸:

### (1) コアモデルの選択肢

- 単一モデル固定か、複数切替可か
- OSS モデル対応か
- 自社ホストモデルを繋げるか

### (2) プロンプト層の自由度

- system prompt をカスタムできるか
- few-shot / ペルソナ / テンプレート管理
- プロンプトの version 管理 / A/B テスト

### (3) コンテキスト層の能力

- RAG 対応 / ドキュメントアップロード
- 長期記憶の仕組み
- context window の扱い (圧縮 / 要約機構)

### (4) ハーネス層の成熟度

- tool calling 対応
- エージェントループの信頼性
- 観測 / 評価機能
- エラー処理 / retry / fallback

### (5) セキュリティ / ガバナンス

- ガードレール ([第 14 章](14-guards.md))
- 監査ログ
- ロールベースアクセス制御
- データの所在 (クラウド / オンプレ)

### (6) 価格 / ライセンス

- 従量課金 / サブスク / OSS
- エンタープライズ契約の有無
- 自社データで学習されるか

**機能リストを見るのではなく、この評価軸で自分のユースケースに当てはめて選ぶ**のが最善。

## 将来の変化に耐える知識とは

プロダクト名は**毎月変わる**。新興が出ては消え、老舗が陳腐化する。しかし**核となる仕組みは数年単位で安定している**:

- LLM API の形 (Chat Completions / OpenAI 互換) → 安定
- tool calling の仕組み → 安定
- messages / state 管理 → 安定
- RAG / embedding / 近傍検索 → 安定
- エージェントループの構造 → 安定
- 観測 / 評価 / ガード → 安定

だから**個別プロダクトを追うより、仕組み (章 01-18) を押さえた方が長く使える**。新しいプロダクトが出てきたときも、「これは LLM + RAG + tool calling を組み合わせたやつか」と即座に分類できる。

## まとめ

- AI ツールは **提供元 / 配信形態 / ターゲット用途** の 3 軸で整理する
- **LLM ベンダー純正** (Anthropic / OpenAI / Google / xAI) は Web chat / App / CLI / API の 4 配信を持つ
- **サードパーティ** は カテゴリ別: エディタ / ターミナル / 検索 / マルチモデル UI / ワークフロー / observability / フレームワーク / ローカル推論
- 各配信形態には得意不得意がある。ユースケースから選ぶ
- **本リポジトリ** hands-on の agent-demo は全プロダクト共通の基盤の最小実装。ここで学んだ知識はそのまま他プロダクトに通用する
- プロダクト評価軸: モデル選択 / プロンプト自由度 / コンテキスト能力 / ハーネス成熟度 / セキュリティ / 価格
- **個別プロダクトより仕組みが長持ち**。章 01-18 の原理を押さえた上で全体像を眺めるのが本質的な理解
