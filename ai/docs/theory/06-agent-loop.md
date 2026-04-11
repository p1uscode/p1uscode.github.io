# エージェントループ

[第 4 章 Messages と state](04-messages-state.md) で「state = messages 配列」を、[第 5 章 Tool calling](05-tool-calling.md) で「LLM が tool_calls を返し、エージェントがツールを実行して `tool` role メッセージを追加する」という 1 往復の仕組みを見た。

この章では、その 1 往復を**何回も繰り返すことで 1 ターンが完結する**仕組み — **エージェントループ** — を見る。停止条件、失敗処理、無限ループ対策まで。

## ループが必要な理由

ユーザの 1 ターンの質問が「今の時間を調べて、その分に 15 をかけて」だったとする。この 1 質問を解くのに LLM が必要な手順は:

1. 時刻を知りたい → `now` ツールを呼ぶ
2. `now` の結果を見る
3. 分の部分を抽出して 15 倍 → `calc` ツールを呼ぶ
4. `calc` の結果を見る
5. 人間向けに整形して答える

つまり **1 人間ターンに対して、LLM 呼び出しは複数回 (この例では 3 回)** 発生する。tool_call の連鎖を回すのは LLM ではなく**エージェント側のループ**で、これが「エージェントループ」と呼ばれる制御フローの正体。

## ループの骨格

擬似コードで書くとこうなる:

```
user メッセージを messages に push

loop:
    response = LLM.invoke(messages, tools)
    messages.push(response.assistant_message)

    if response.finish_reason == "stop":
        break                          # LLM が最終応答を出した
    if response.finish_reason == "tool_calls":
        for call in response.tool_calls:
            result = execute_tool(call)
            messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: result
            })
        continue                       # LLM にもう一度聞きに行く

return messages[-1]                    # 最終応答
```

ASCII の状態遷移で書くとこう:

```
         ┌─────────────────────┐
         │  user メッセージ追加 │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
 ┌─────► │  LLM 呼び出し        │ ◄──┐
 │       │  (invoke messages)  │    │
 │       └──────────┬──────────┘    │
 │                  ▼                │
 │         finish_reason 判定        │
 │              ┌──┴──┐              │
 │              │     │              │
 │             stop  tool_calls      │
 │              │     │              │
 │              ▼     ▼              │
 │         [最終応答] [ツール実行]   │
 │              │     │              │
 │              │     ▼              │
 │              │ [tool msgs 追加]   │
 │              │     │              │
 │              │     └──────────────┘
 │              ▼
 │         [1 ターン完了]
 │              │
 └──────────────┘
    (次の user メッセージ待ち = 対話モードなら次ターンへ)
```

## ターンとイテレーションの区別

ここが混乱しやすいので整理。

| 用語 | 単位 | いつ増える | agent-demo での観点 |
|---|---|---|---|
| **ターン (turn)** | ユーザ視点の 1 やりとり | user メッセージ 1 つから次の user メッセージまで | `agent-chat.ts` の while ループが 1 回まわる |
| **イテレーション (iteration) / ステップ** | LLM 呼び出し 1 回 | `agent.invoke` 内部で LLM が 1 回呼ばれるたび | エージェントループの内側、ユーザには見えない |

**1 ターン = 1 イテレーションとは限らない**。質問がシンプルなら 1 イテレーションで終わる (ツール無し)。ツールを 3 回連鎖したら 4 イテレーション (最後の LLM 呼び出しが最終応答)。

LangChain の `createAgent` や `AgentExecutor` は**このイテレーションの管理を自動でやってくれる**。`agent.invoke({messages})` を 1 回叩くだけで、内部でループが回って最終応答が返ってくる。エージェント使用者から見える単位はターンだけ。

## 停止条件

ループは何らかの停止条件に到達するまで回り続ける。主な停止条件は 5 つ:

### 1. 自然終了 (`finish_reason: "stop"`)

LLM が「もう言うことがない、応答完了」と判断したとき。`assistant` メッセージに `content` が入っていて `tool_calls` は無し。これが一番普通の終わり方。

### 2. 最大反復回数の超過

**無限ループを防ぐための安全装置**。LLM がツール呼び出しを延々と繰り返したり、同じことを何度も試したりするケースに備えて、**「1 ターンで LLM を呼ぶのは最大 N 回まで」という上限を必ず設ける**。LangChain だと `AgentExecutor` の `maxIterations` (デフォルトは 15 前後) が該当。agent-demo の `setup.ts` でもこれを設定できる。

上限に達したらループを強制終了し、その時点で手元にあるメッセージから最善の応答を返す (または「上限到達」エラーを返す)。これが無いとコスト暴走 / タイムアウト / 顧客からの苦情に直結する。

### 3. ツール実行エラー

ツール関数が例外を投げたときの挙動はエージェント側で決められる。主な選択肢は:

- **エラーを `tool` role メッセージとして LLM に戻す**: LLM はそれを読んで「別の方法を試そう」「ユーザに状況を説明しよう」と判断できる (柔軟だがループが伸びる)
- **ループ全体を即座に失敗にする**: 致命的なエラー (権限なし / 内部バグ) ならこっち
- **リトライする**: 一時的な失敗 (ネットワークタイムアウト / 429) ならバックオフ付きで再試行

agent-demo は LangChain のデフォルト挙動 (エラーを `tool` メッセージで LLM に戻す) を使っている。

### 4. LLM 呼び出しの失敗

LLM API 自体が失敗するパターン:

- 429 rate limit → リトライ or [LiteLLM](../setup/services.md) のフォールバック設定で別モデルへ切り替え
- 5xx サーバエラー → リトライ
- 400 bad request → リクエストが壊れている (messages が context window 超え、ツールスキーマ不正 等)。即座に失敗
- 401 認証エラー → 即座に失敗

LangChain JS / LiteLLM は一時的エラーの自動リトライを内部で持っている。本リポジトリでは `services/litellm/config.yaml` の `num_retries: 2` と `router_settings.fallbacks` で多段に守っている。

### 5. 明示的な終了シグナル (end_chat 等)

エージェント側が「このターンで会話を終わらせる」と判断するための専用ツール。agent-demo の [`end_chat` ツール](https://github.com/p1uscode/p1uscode.github.io/blob/main/ai/examples/agent-demo/src/tools.ts) がまさにこれ:

- LLM が「会話完了」と判断したら `end_chat` を呼ぶ
- ツール関数は module-level フラグを立てて、ツール結果として "Conversation marked as complete" を返す
- エージェントループ自体は普通に最終応答を返して一旦終わる
- **外側の対話ループ (agent-chat.ts の while)** が `consumeEndChatSignal()` を見て次ターンに進まず break する

これは「ループの停止」ではなく「**対話モード全体の終了**」を扱っている点に注意。エージェントループ (1 ターン内のツール連鎖) は自然終了 (`finish_reason: stop`) で終わり、その外側の対話ループを end_chat が止めている、という 2 層構造。

## 並列ツール呼び出し

LLM は 1 回の `tool_calls` に**複数のツール呼び出しを同時に**入れてくることがある。例えば:

```json
"tool_calls": [
  { "id": "call_1", "function": { "name": "search",    "arguments": "..." } },
  { "id": "call_2", "function": { "name": "wikipedia", "arguments": "..." } }
]
```

これは LLM が「この 2 つは互いに依存しないから並行に調べて OK」と判断したケース。エージェント側の実装としては:

- **並列実行**: `Promise.all` で同時に走らせる (レイテンシが短い)
- **逐次実行**: for ループで順番に (実装が簡単、依存関係を誤っても安全)

LangChain の `createAgent` は**並列実行がデフォルト**。ただしツール側が race condition に弱い (DB 書き込み等) なら逐次にした方が安全。並列で走らせる場合も、**LLM に戻すときは `tool_calls` の順序を保った tool メッセージ列**として追加する必要がある。

## ループが進むときの messages の育ち方

1 ターンの中で `messages` 配列はどう育つか、実際の形を追いかける。[第 5 章](05-tool-calling.md) の「今の時間を調べて、分に 15 をかけて」を例に:

### 初期状態

```
[
  { role: "system", content: "..." },
  { role: "user",   content: "今の時間を調べて、分に 15 をかけて。" }
]
```

### イテレーション 1: LLM 呼び出し → `now` 要求

```
[
  { role: "system", content: "..." },
  { role: "user",   content: "今の時間を調べて、分に 15 をかけて。" },
  { role: "assistant", content: null, tool_calls: [{ id: "c1", function: { name: "now", arguments: "{}" } }] }
]
```

### エージェントが `now` 実行 → `tool` メッセージ追加

```
[
  ...,
  { role: "assistant", content: null, tool_calls: [...] },
  { role: "tool", tool_call_id: "c1", content: "2026-04-11T02:28:00.000Z" }
]
```

### イテレーション 2: LLM 再呼び出し → `calc` 要求

```
[
  ...,
  { role: "tool", tool_call_id: "c1", content: "2026-04-11T02:28:00.000Z" },
  { role: "assistant", content: null, tool_calls: [{ id: "c2", function: { name: "calc", arguments: "{\"expression\":\"28*15\"}" } }] }
]
```

### エージェントが `calc` 実行 → `tool` メッセージ追加

```
[
  ...,
  { role: "tool", tool_call_id: "c2", content: "420" }
]
```

### イテレーション 3: LLM 再呼び出し → 最終応答

```
[
  ...,
  { role: "assistant", content: "現在の時刻は UTC 02:28 なので、分の 28 に 15 を掛けると 420 です。" }
]
```

`finish_reason: "stop"` でループを抜け、最後の `assistant` メッセージをユーザに返す。**3 回の LLM 呼び出しと 2 回のツール実行が 1 ターンの中で起きた**ことになる。

これは [第 4 章](04-messages-state.md) で触れた「1 ターン = 1 user から次の user まで、内部では LLM が 1 〜 N 回呼ばれる」の具体例。

## コストとレイテンシの帰結

エージェントループが N イテレーション回るということは:

- **LLM を N 回叩いている**: 各回の `prompt_tokens + completion_tokens` がそれぞれ課金される
- **prompt が毎回育っている**: 2 回目以降は前回までの assistant / tool メッセージを含む配列を送るので、**後のイテレーションほど prompt が長い = 高い**
- **各回のレイテンシが積算される**: 1 回 1〜3 秒としても 5 回ループすれば 5〜15 秒かかる

だからエージェントの実装では「**いかに少ないイテレーションで終わらせるか**」がコスト / UX の両方に効いてくる。この改善には:

- **道具の description を具体的に** → LLM の選択ミスが減り、無駄なツール呼び出しが起きにくい ([第 5 章](05-tool-calling.md))
- **並列 tool_calls を活用** → 3 回逐次が 1 回並列に
- **プロンプトキャッシュ** → 2 回目以降の system prompt + 共通 context が割引 ([第 7 章](07-memory.md) L2)
- **コンテキスト圧縮** → 古いツール結果を要約して詰める ([第 3 章](03-tokens-context.md))
- **モデル選択** → 難しい判断は大きいモデル、単純な tool dispatch は小さいモデル (route LLM + worker LLM 分離も可能)

## agent-demo のコードとの対応

agent-demo では LangChain JS の `createAgent` がエージェントループを内部で持っていて、使う側から見えるのは `agent.invoke(...)` 1 回だけ:

```typescript
// examples/agent-demo/src/setup.ts (抜粋)
export function createAgentInstance(mode: "single-shot" | "interactive") {
  return createAgent({
    model: llm,
    tools,
    systemPrompt,
  });
}

// examples/agent-demo/src/agent-single.ts (抜粋)
const result = await agent.invoke(
  { messages: [{ role: "user", content: userInput }] },
  { callbacks: [langfuse], metadata: { source: "agent-single" } },
);
// ↑ この 1 行の内部でループが何回か回って、最終応答が含まれる messages が返る
```

`result.messages` に**1 ターンで発生した全メッセージ** (user + assistant[tool_calls] + tool + assistant[tool_calls] + tool + ... + assistant[最終応答]) が入っている。Langfuse のトレースを見ると、この**各イテレーションが階層 span として可視化される**ので、どのタイミングでどのツールが呼ばれたか、各イテレーションで何トークン消費したかが後から追える。次章 ([Observability](08-observability.md)) でここを見る。

### 対話モードでは 2 層のループ

`agent-chat.ts` では:

```typescript
while (true) {                              // ← 外側 = 対話ループ (ターン単位)
  const userInput = await rl.question(...);
  if (userInput === "/exit") break;

  messages.push({ role: "user", content: userInput });
  const result = await agent.invoke(        // ← 内側 = エージェントループ (この章)
    { messages },
    ...
  );
  messages = result.messages;

  if (consumeEndChatSignal()) break;        // end_chat で外側も終了
}
```

**内側のエージェントループ**は 1 ターン内のツール連鎖を回す。**外側の対話ループ**はユーザとの複数ターンを回す。この 2 層を混同しないこと。

## まとめ

- **エージェントループ** = 1 ターンの中で「LLM 呼び出し → tool_calls 判定 → ツール実行 → 結果追加 → LLM 再呼び出し」を繰り返す制御フロー
- **1 ターン ≠ 1 LLM 呼び出し**。1 ターン内でツール連鎖すれば LLM は 3〜10 回呼ばれるのが普通
- **停止条件** 5 つ: (1) `finish_reason: stop` / (2) 最大反復回数 / (3) ツール例外 / (4) LLM API 失敗 / (5) 明示的な終了シグナル (`end_chat` 等)
- **無限ループ対策に `maxIterations` は必須**。これが無いとコスト暴走する
- **並列ツール呼び出し**: LLM は 1 回に複数の tool_calls を返せる。エージェントは並列 or 逐次を選んで実行
- **イテレーションが増えるほどコスト / レイテンシが積算**される。少ないイテレーションで終わらせる工夫がエージェント性能の肝
- **LangChain の `createAgent` は 1 ターン分のループを内包**していて、使用者からは `agent.invoke` 1 回に見える
- **対話モードでは外側の対話ループと内側のエージェントループの 2 層**。混同しないこと
