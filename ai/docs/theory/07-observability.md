# Observability / tracing

[第 5 章 エージェントループ](05-agent-loop.md) で「1 ターンの中で LLM が 3〜10 回呼ばれるのが普通」と書いた。この内部は**実行中はログを見ないと何が起きているか分からず、終わった後も再現が難しい**。

Observability (可観測性) は、エージェントの**各ステップを後から追えるように記録しておく仕組み**。この章では観測が何を解決するのか、trace / span の基本、Langfuse での実装と見え方を扱う。

## なぜ必要か

エージェントは複雑に壊れる。代表的な症状:

- **質問に対して見当違いな応答** — どこで道を間違えたか? system prompt の影響? 間違ったツールを選んだ? ツール結果を誤読した?
- **応答がやたら遅い** — LLM 呼び出しが何回走った? どのツールで待たされた? ネットワーク? モデル側の遅延?
- **請求が高い** — 1 ターンで何トークン消費したか? どのツールの prompt が重いか?
- **同じ質問なのに結果がブレる** — サンプリング由来? 検索結果の非決定性? 並列実行の順序?
- **本番で時々エラー** — どの tool_call が失敗した? そのときの引数は? LLM はエラーにどう反応した?

どれも**ステートレスな API を N 回叩いた結果の積み重ね**なので、実行ログが残っていないと再現も調査も不可能。**「1 ターンの実行を後から全スペ見られる」仕組みが必要**で、それが Observability。

## 用語: trace と span

観測の世界で基本になる 2 つの用語 (OpenTelemetry 由来):

- **span**: 1 つの処理単位の記録。開始時刻 / 終了時刻 / 入力 / 出力 / エラー / メタデータを持つ。例: 「`calc` ツール呼び出し」「gemini-2.5-flash への 1 回の LLM 呼び出し」
- **trace**: 関連する span 群を親子関係でまとめた木。例: 「ユーザ質問 1 ターン全体」

span は**親子関係**を持てる。エージェントループの 1 ターンを木で表すと:

```
AgentExecutor                              ← 親 span (1 ターン全体)
├─ ChatOpenAI (iteration 1)                ← 子 span (LLM 呼び出し)
│  └─ HTTP POST /v1/chat/completions       ← 孫 span (内部 HTTP、任意)
├─ tool: now                               ← 子 span (ツール実行)
├─ ChatOpenAI (iteration 2)                ← 子 span (LLM 再呼び出し)
├─ tool: calc                              ← 子 span (ツール実行)
└─ ChatOpenAI (iteration 3, 最終応答)      ← 子 span
```

親 span の時間範囲は子 span 群を内包する (必然的に、親が子の実行を待って集計する)。この木構造があるおかげで「1 ターンのうちどこが遅かったか / どこでエラーが出たか / トークン消費はどこに集中したか」が一目で分かる。

## Langfuse が扱うもの

本リポジトリでは [Langfuse](../setup/services.md) がこの span を受けて UI で可視化する。Langfuse は OpenTelemetry + 独自拡張ベースで動いており、各 span には次の情報が載る:

| 項目 | 中身 |
|---|---|
| **時間軸** | 開始 / 終了時刻、duration |
| **input / output** | その span が受け取ったもの / 返したもの (LLM なら messages 配列と応答、ツールなら引数と結果) |
| **usage** | LLM span の場合: prompt_tokens / completion_tokens / total_tokens / 料金計算 |
| **metadata** | 任意の構造化データ (source, trace_id, version 等) |
| **tags** | 文字列の配列 (`"agent-demo"` 等)、フィルタ用 |
| **error** | 例外内容、finish_reason が異常だったときの情報 |
| **parent span id** | 親 span への参照。これで木構造を復元 |

さらに**トレース全体**のメタデータとして:

- **sessionId** — 複数トレースをグルーピング ([第 3 章](03-messages-state.md) で強調した通り state ではなく観測用タグ)
- **userId** — ユーザ別の集計に使う
- **traceName** — トレースの代表名 (`LangGraph` 等)
- **release** / **version** — アプリのバージョン追跡

Langfuse の UI では Traces タブで 1 本のトレースを選ぶと、上の木構造がタイムライン付きで展開され、各 span の input / output / usage を個別に掘れる。

## agent-demo の実装

観測データがどう生成されて Langfuse に届くかは `examples/agent-demo/src/setup.ts` を見ると 3 層構造が分かる:

```typescript
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { CallbackHandler } from "@langfuse/langchain";

// ① OTel の TracerProvider を立てる
const tracerProvider = new NodeTracerProvider({
  spanProcessors: [
    // ② Langfuse 専用の SpanProcessor を追加
    new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.AGENT_LANGFUSE_HOST ?? "http://langfuse.home.arpa",
      shouldExportSpan: () => true,
    }),
  ],
});
tracerProvider.register();

// ③ LangChain のコールバックハンドラ
export function createLangfuseHandler(mode: "single-shot" | "interactive") {
  return new CallbackHandler({
    sessionId: `agent-demo-${Date.now()}`,
    tags: ["agent-demo", mode],
  });
}
```

役割を 1 段ずつ:

1. **`NodeTracerProvider`** ([@opentelemetry/sdk-trace-node](https://www.npmjs.com/package/@opentelemetry/sdk-trace-node)): Node.js 向けの TracerProvider。Async Hooks で context 伝搬を面倒見てくれる。`register()` するとグローバルになり、以降 OTel API で作られた span はこの provider を経由する
2. **`LangfuseSpanProcessor`** (@langfuse/otel): 生成された span を受け取って Langfuse のバックエンドに HTTP で送信するフック。認証情報 (publicKey / secretKey / baseUrl) を持つのはここ
3. **`CallbackHandler`** (@langfuse/langchain): LangChain の `invoke` にコールバックとして渡すと、エージェント内部の各イテレーションに対して `startActiveObservation()` を呼び、①②の仕組みに乗って span が生まれる

そして `agent-single.ts` / `agent-chat.ts` で実際に繋ぐのは 1 行:

```typescript
const result = await agent.invoke(
  { messages: [...] },
  { callbacks: [langfuse], metadata: { source: "agent-single" } },
);
```

`callbacks: [langfuse]` を渡すだけで、エージェントループ内の全 LLM 呼び出し / ツール呼び出しが自動で観測される。metadata や tags は span に付与され、後で Langfuse UI でフィルタに使える。

### 流れを図にするとこう

```
[agent.invoke]
    │
    ▼
[LangChain 内部ループ]
    │   LLM 呼び出し / ツール呼び出しのたびに
    ▼
[CallbackHandler.startActiveObservation]
    │   OTel の startActiveSpan を呼ぶ
    ▼
[TracerProvider 経由で span 生成]
    │
    ▼
[LangfuseSpanProcessor.onEnd]
    │   span が完了するごとに
    ▼
[HTTP POST → Langfuse backend]
    │
    ▼
[Langfuse DB に保存 → UI で可視化]
```

OTel の context propagation ([第 4 章](04-tool-calling.md) で触れた AsyncHooksContextManager) が効いているので、エージェントが多段に並列でツールを実行しても、span の親子関係は自動的に正しく保たれる。これは `NodeTracerProvider.register()` が内部で AsyncHooksContextManager をグローバル登録しているおかげ。

## トレースから何が読み取れるか

実際のトレースを開くと、以下のような情報が一画面に揃う。

### (1) タイムライン

各 span を横軸=時間で並べたガントチャート風の表示。

- **どこで待たされているか**: LLM 呼び出しが 3 秒、ツール呼び出しが 100 ms 等、ボトルネックが一目瞭然
- **並列 tool_calls が本当に並列で動いているか**: 並んでいれば OK、逐次になっていれば改善余地
- **1 ターンの総所要時間**: 親 span の duration

### (2) 各 span の input / output

LLM span なら:

- 入力: そのイテレーション時点の `messages` 配列 (system + 過去の全 role)
- 出力: `assistant` の応答 (`content` か `tool_calls`)
- usage: prompt / completion トークン、料金

ツール span なら:

- 入力: 引数 (JSON)
- 出力: ツールの返り値

これが残っているおかげで、**「どの段階でどの情報が LLM に渡っていたか」を後からピンポイントで確認できる**。間違った応答の原因を追うときは、各イテレーションの messages を上から読んでいって「どこで話がおかしくなったか」を特定する。

### (3) 集計

Langfuse の Dashboard / Sessions タブで:

- **コスト**: ターン別 / セッション別 / ユーザ別の合計料金
- **レイテンシ**: p50 / p95 / p99 の応答時間
- **トークン消費**: モデル別の利用量
- **失敗率**: エラー件数とその内訳

本番運用では「このユーザだけコストが跳ね上がっている」「この時間帯だけレイテンシが悪化している」を検知するアラート基盤になる。

## デバッグの典型的な流れ

エージェントがヘンな応答をしたとき、Langfuse を使った調査手順:

1. **質問からトレースを逆引き**: Traces タブで `tags=agent-demo` + 時間帯で絞り込む
2. **親 span (LangGraph 等) を開く**: 全体の iteration 数 / 最終応答 / 総 duration を確認
3. **タイムラインを上から眺める**: 異常な duration や error がないか
4. **各 LLM 呼び出しの messages を読む**: どのイテレーションで論点がズレたか
5. **tool_calls の引数と結果を読む**: LLM が投げた引数は妥当だったか、ツールは正しく返したか
6. **usage と finish_reason を確認**: `length` で途中打ち切りなら `max_tokens` 不足、`tool_calls` が並んだ末に `stop` が来ないなら無限ループの疑い
7. **同じトレースを Playground で再実行**: Langfuse の Playground で `messages` をコピーして別モデルで試す、プロンプト修正して差分を見る

この作業は print デバッグと同じ発想だが、**エージェント用にあらかじめ全ログが構造化されて残っている**ので、生ログを grep するよりはるかに速い。

## sessionId / userId / tags / metadata の使い分け

Langfuse に付ける識別子の使い分け:

| 種類 | 粒度 | 用途 | 例 |
|---|---|---|---|
| `sessionId` | 同じ会話 (対話モードの 1 セッション) | 時系列でターンをまとめて見る | `agent-chat-1775849321618` |
| `userId` | 同じユーザ (人) | ユーザ別の集計、問題の特定 | `user-alice` |
| `tags` | 自由なラベル | フィルタ、A/B テスト、環境分離 | `["agent-demo", "production", "experiment-A"]` |
| `metadata` | 任意の key-value | 個別 span への詳細コンテキスト | `{source: "agent-chat", version: "v1.2.3"}` |
| `release` | アプリバージョン | デプロイ単位での品質比較 | `v1.2.3` |

agent-demo は現状 `sessionId` と `tags` だけ使っているが、本番運用では `userId` と `release` を付けるのが普通。例えば:

- 特定バグの報告が来たら `userId` で絞って直近トレースを見る
- 新バージョン release 後の品質変化を `release=v1.3.0` で絞って比較
- A/B テストなら `tags=["variant-A"]` / `tags=["variant-B"]` で両群の成績を集計

## 評価への布石

Langfuse に溜まったトレースは**そのまま評価用データセットの材料**になる。章 10 で詳しく扱うが、大雑把には:

1. 良いトレース / 悪いトレースを人手で選別 (UI からスコア付け or タグ付け)
2. 同じ質問に対して別モデル / 別プロンプトで再実行、出力を比較
3. LLM-as-a-judge で「この応答は妥当か」を自動スコアリング
4. 回帰テストとして CI に組み込む

**観測はデバッグだけでなく、改善サイクルの入り口**でもある。何を測れていないと、何を良くしていいか分からない。

## 他の選択肢 (参考)

Observability プラットフォームは Langfuse 以外にもいくつかある:

| 名前 | 特徴 | 本リポジトリで採用しない理由 |
|---|---|---|
| **LangSmith** | LangChain 公式、機能は豊富 | クラウド中心、セルフホストがやや重い |
| **Phoenix (Arize)** | OSS、OTel ネイティブ、評価機能あり | Langfuse と機能が被る |
| **Helicone** | プロキシ型 (リクエストを経由させる) | エージェント側の span ツリーは作れない |
| **Braintrust** | 評価機能が強力 | 有料 |
| **Datadog / Honeycomb / New Relic** | 汎用 APM、OTel 互換 | LLM 固有機能が弱い、コスト高 |

**OTLP (OpenTelemetry Protocol) 互換**で送っておけば後から exporter を差し替えるだけで移行できるのが、OTel ベースにする最大のメリット。Langfuse に縛られたくなければ Phoenix や自前の OTLP endpoint に同じ span を同時送信することもできる (`NodeTracerProvider` の `spanProcessors` 配列に追加するだけ)。

## 第 6 章との関係: 観測は「記憶」ではない

ここは誤解されがちなのでもう 1 回強調する。[第 3 章](03-messages-state.md) / [第 6 章](06-memory.md) で書いたように、**Langfuse のトレースは「観測のための記録」であって、LLM の記憶ではない**。

| 観測 (この章) | 記憶 (第 6 章) |
|---|---|
| 実行が終わった後の記録 | 次のリクエストに持ち越す情報 |
| LLM には届かない | LLM の入力そのもの |
| デバッグ / 評価 / 集計に使う | 会話継続 / 長期記憶に使う |
| 任意に消せる (過去トレース削除) | 消すと「次のターンで忘れる」挙動に直結 |

両者は独立に設計する。Langfuse に全部送ってあるからといって、それが LLM の記憶になるわけではない (アプリが能動的に読み戻さない限り)。

## まとめ

- **Observability はエージェント開発の必須インフラ**。デバッグ / コスト管理 / 評価 / 改善の入り口
- **trace = 関連 span の木**、**span = 1 処理単位の記録** (時刻 / 入出力 / usage / エラー)
- エージェントの 1 ターンは `AgentExecutor` を親 span として、**各 LLM 呼び出し / ツール呼び出しが子 span** になる木構造で表現される
- agent-demo は `NodeTracerProvider + LangfuseSpanProcessor + CallbackHandler` の 3 層で実装
- **`callbacks: [langfuse]` を `invoke` に渡すだけ**で全自動で span が送られる
- トレースから読めるもの: タイムライン / 各 span の input/output / usage / エラー / 集計
- `sessionId` / `userId` / `tags` / `metadata` / `release` を使い分けて、本番運用では「この問題を起こしたのは誰か / いつから悪化したか」を追える体制にする
- **観測は「記憶」ではない**。Langfuse のセッションは state ではなく、トレース DB のタグ
- OTel ベースなので、将来 Langfuse 以外の observability に乗り換えても exporter 差し替えで済む
