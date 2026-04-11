# サンプリングパラメータ

[第 2 章](02-llm-call.md) で「同じ質問を何度投げても毎回少しずつ違う応答が返ってくる」と書いた。この揺らぎを制御するのが**サンプリングパラメータ**。temperature / top_p / seed / max_tokens などの設定値で、LLM の出力が「決定論的 ↔ 多様・創造的」のどこに寄るかが変わる。

## なぜ LLM は揺らぐか

LLM は**次のトークンを確率分布から選ぶ** (= サンプリングする) という仕組みで動いている (詳細は [第 15 章 LLM の仕組み](15-llm-internals.md))。大雑把には:

1. 現在の文脈からモデルは次のトークン候補に確率を出す
2. その分布からサンプリング (確率に従って 1 つ選ぶ) する
3. 選んだトークンを末尾に追加して、また 1 に戻る

**サンプリング時のルール**をパラメータでいじるのが、この章で扱う話。

## temperature (温度)

最も有名なパラメータ。**「確率分布をどれだけ平滑化するか」**を制御する。

- **`temperature: 0`** → 常に最大確率のトークンだけを選ぶ (greedy decoding)。**ほぼ決定論的**になる
- **`temperature: 1`** → モデルが学習した通りの分布からサンプリング。**バランス型**
- **`temperature: 2`** → 分布を極端に平らにする。**低確率の候補も選ばれやすくなり、創造的 / ランダム**に
- **`temperature: 0.7` 〜 `1.0`** → 実務のデフォルト帯。多様性がありつつ破綻は少ない

### 使い分けの目安

| ユースケース | 推奨 temperature |
|---|---|
| ツール呼出 / 構造化出力 / 分類 / 抽出 | **0** (決定論性が欲しい) |
| 事実の回答 / RAG / Q&A | **0 〜 0.3** |
| 対話アシスタント / 汎用チャット | **0.5 〜 0.8** |
| クリエイティブ生成 / ブレインストーミング / 詩 / 物語 | **0.8 〜 1.2** |
| 多様な候補を並列生成して選ぶ | **1.0** (+ `n` で複数出力) |

**agent-demo は `temperature: 0`** (`setup.ts` 参照) にしている。ツール呼出の正確性を最優先しているため。

### temperature 0 は完全に決定論的ではない

注意: `temperature: 0` でも**完全に同じ出力**は保証されない。理由:

- 最大確率のトークンが同点だった場合、実装によっては違うものを選ぶ
- 浮動小数点演算の順序は GPU / バッチサイズ / ハードウェア依存
- プロバイダ側のバッチ推論で他リクエストと混ぜる実装がある

「ほぼ同じ」が取れるが、「バイナリ一致」は保証されない。厳密に固定したければ `seed` パラメータも併用する。

## top_p (nucleus sampling)

**確率の高い方から累積確率が `top_p` に達するまでの候補だけに絞って**サンプリング。

- `top_p: 1.0` → 全候補を使う (temperature の制約のみ)
- `top_p: 0.9` → 上位候補の 90% 分だけ使う (長い尾を切る)
- `top_p: 0.1` → 上位数個だけ (temperature を低くしたのに近い効果)

temperature と top_p は重複する制御軸で、**両方同時にいじらない**のが慣例。通常は:

- **temperature 派** (OpenAI API デフォルト): temperature を動かす、top_p は 1 固定
- **top_p 派**: temperature を 1 固定、top_p を動かす

どちらでもよく、大きな差はない。Anthropic / OpenAI 共通で両方サポートしている。

## top_k

**上位 K 個の候補だけ**を使う。`top_k: 40` なら上位 40 個だけからサンプリング。OpenAI Chat Completions にはないが、Anthropic API や Ollama にはある。top_p と似た役割。

## seed

**同じ seed + 同じパラメータ + 同じ入力 → 同じ出力**を狙うための乱数シード。

- 一部のモデル / プロバイダだけサポート (OpenAI は対応、Anthropic はサポート無し)
- サポートしていても「best effort」で、厳密な一致は保証されない (バッチの状況で変わる)
- 再現性のあるテストを書きたい時に使う

## max_tokens

**出力の最大トークン数**。超えたら生成を強制終了して `finish_reason: "length"` を返す (結果は途中で切れる)。

- デフォルトはモデルによって違う (4K 〜 16K 程度)
- 短い応答を強制したければ `max_tokens: 200` 等
- 長文を安全に生成したければ余裕を持った値に (context window と合わせて超えないよう注意、[第 3 章](03-tokens-context.md))
- 推論モデル (GPT-5.4 reasoning / Claude thinking) では**思考トークンを含めた上限**として扱われる

## stop (stop sequences)

**特定の文字列が出力に現れたら生成を止める**。エージェント的な用途で「この区切り文字が出たら打ち切り」というパターンで使う。

```json
{ "stop": ["\n\n", "USER:", "```"] }
```

最近は tool calling 等が主流なので使われる頻度は減ったが、カスタム形式の出力 (古典的な ReAct 等) で活きる。

## frequency_penalty / presence_penalty

OpenAI 互換の拡張。**同じ語の繰り返しを抑制**する。

- `frequency_penalty: 0〜2` → 既出語の頻度に比例してペナルティ
- `presence_penalty: 0〜2` → 既出語に一律ペナルティ

「同じフレーズを繰り返す LLM」の対策に使う。最近のモデルは素でループしにくいのであまり出番はない。

## 推論モデル特有のパラメータ

GPT-5.4 reasoning / Claude extended thinking / Gemini thinking では、**推論の深さ**を制御する別パラメータがある:

- **OpenAI**: `reasoning_effort: "low" | "medium" | "high"`
- **Anthropic**: `thinking: { type: "enabled", budget_tokens: 8000 }`
- **Gemini**: `thinkingConfig: { thinkingBudget: 8000 }`

深いほど精度が上がるがレイテンシ / コストも上がる。通常のタスクなら low、難しい問題なら high と使い分ける。

## サンプリングと agent-demo

`examples/agent-demo/src/setup.ts` で `ChatOpenAI` を作る際に設定している:

```typescript
const llm = new ChatOpenAI({
  model: MODEL,
  temperature: 0,           // ← 決定論的に (ツール呼出の正確性を優先)
  apiKey: "sk-none",
  configuration: { baseURL: LLM_BASE_URL },
});
```

**エージェントの根幹は tool calling なので temperature 0 が基本**。これをクリエイティブタスク (ストーリー生成 / コピーライティング等) に使うなら 0.7〜1.0 に上げる。

一方で、**最終応答だけ temperature を上げたい**という要求もある (ツール呼出は正確に、最終メッセージは自然に)。これは同じエージェント内で 2 種類の LLM インスタンス (low-temp / high-temp) を使い分ける実装で解決する。

## 温度を動かすときの実践的な注意

### (1) ループが増える可能性

temperature を上げると**同じ tool を別引数で呼び直す**等の揺れが起きやすくなり、エージェントループの iteration 数が増える。コストとレイテンシが跳ねる。

### (2) 出力フォーマット破壊

JSON 構造化出力を要求しているのに temperature が高いと**JSON が壊れる**ことがある。構造化出力は **temperature 0** が安全。最近は `response_format: { type: "json_object" }` や `tool_choice` を使って構造を強制する方が堅牢。

### (3) 再現性のあるテストが難しくなる

[第 11 章 評価](11-evaluation.md) で扱った回帰テストは temperature が揺れると判定がブレる。評価時は temperature 0 (+ seed) で走らせるのが基本。

### (4) ユーザ体感の差は大きくない

temperature 0.3 と 0.7 の体感差は思ったより小さい。多くのユースケースで「揺らぎ有無だけ選ぶ」で十分。細かいチューニングに時間をかけるより、プロンプト設計の改善の方が効く ([第 13 章](13-system-prompt.md))。

## まとめ

- LLM は確率分布からトークンを**サンプリング**している。その挙動を制御するのがサンプリングパラメータ
- **`temperature`** が中核: 0 = 決定論的、1 = バランス、高い = 多様/創造的
- **`top_p`** / **`top_k`** は候補集合を絞る別軸。temperature と同時に動かさない
- **`seed`** は再現性狙い、ただし best effort
- **`max_tokens`** は生成の長さ上限
- **`stop`** は特定文字列での打ち切り
- **推論モデル** は `reasoning_effort` / `thinking` / `thinkingConfig` で推論深度を制御
- **agent-demo は temperature 0** (ツール呼出の正確性優先)
- 温度を上げるとループ増加 / フォーマット破壊 / 評価ブレ のリスク
- 実務では**揺らぎ有無だけ選び**、細かいチューニングよりプロンプト設計に時間を使う方が効く
