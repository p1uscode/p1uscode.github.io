# Messages と state

[第 2 章](02-llm-call.md) で「LLM API はステートレスで、クライアント側が毎回 `messages` を丸ごと送る」と書いた。この章ではその `messages` の中身と、クライアントが持っている「状態 (state)」の正体を詳しく見る。

**結論を先に言うと、LLM エージェントにおける state = messages 配列そのもの**。どこに保存するかは後で選べばよく、まず「state とは何のことを指しているのか」を明確にする。

## messages 配列の構造

`messages` は順序付きリストで、各要素は次の形:

```json
{ "role": "...", "content": "..." }
```

順序がそのまま会話の時系列を表し、LLM はこの配列を**全部読んで次に言うべきことを推論する**。過去のメッセージを自由に削除 / 編集 / 挿入できる (そうすると LLM の認識も変わる) のがポイントで、会話は「発話の蓄積」ではなく「毎回クライアントが組み立てて渡す snapshot」。

### 4 つの role

OpenAI 互換の範囲でよく使う role はこの 4 つ:

| role | 誰の発言か | 典型 content | 特徴 |
|---|---|---|---|
| `system` | エージェント設計者 | 振る舞い指示、制約、例示 | 先頭 1 つだけ置くのが普通。2 個目以降は無視 or 警告されるモデルが多い |
| `user` | 人間 | 質問、依頼 | 必ず `assistant` と交互になるとは限らない (ツール結果が間に入ることもある) |
| `assistant` | LLM 自身 (過去の出力) | 応答テキスト、または `tool_calls` を伴うツール呼び出し | `content` が null で `tool_calls` だけのパターンもある ([第 5 章](05-tool-calling.md) で扱う) |
| `tool` | ツール実行の結果 | ツールが返した文字列 (JSON など) | `tool_call_id` で「どの tool_call への応答か」を紐付ける ([第 5 章](05-tool-calling.md) で扱う) |

### 典型的な配列の並び

シンプルな 1 往復だけの会話:

```json
[
  { "role": "system", "content": "親切な日本語アシスタント" },
  { "role": "user",   "content": "富士山の高さは?" },
  { "role": "assistant", "content": "富士山の高さは 3,776 メートルです。" }
]
```

対話が 2 往復に伸びると:

```json
[
  { "role": "system",    "content": "..." },
  { "role": "user",      "content": "富士山の高さは?" },
  { "role": "assistant", "content": "3,776 メートルです。" },
  { "role": "user",      "content": "じゃあ世界で何番目?" },
  { "role": "assistant", "content": "標高では世界で約 50 位、..." }
]
```

2 ターン目では **1 ターン目の user と assistant も全部再送**する。これをしないと LLM は「富士山」という文脈を忘れて、突然 "何番目?" と聞かれることになる (そして「何のことですか?」と返す)。

ツール呼び出しが混じると `assistant` の `tool_calls` と `tool` role が配列に挟まるが、それは [第 5 章](05-tool-calling.md) で見る。

## 「1 ターン」の定義

エージェントの世界で「1 ターン」というとき、厳密には:

> **1 つの user メッセージから始まり、次に新しい user メッセージが追加されるまで**

を指す。1 ターンの中で LLM は何回呼ばれるかは決まっていない:

- 単純な Q&A なら 1 回 (user → assistant で終わり)
- ツールを 1 回呼ぶなら 3 回 (user → assistant tool_calls → tool → assistant 最終応答)
- ツールを 3 回連鎖するなら 5 回
- 曖昧な質問で LLM が追加質問を返すなら 1 回 (user → assistant 質問 で一旦終わり)

**API 呼び出し回数とターン数は別物**で、1 ターン内に API は 1 〜 N 回呼ばれる。この関係は第 6 章 (エージェントループ) で詳しく扱う。

## state = 「次に API に送る messages 配列」

ここが最も大事な概念。**LLM エージェントにおける「状態」とは、クライアントが持っている `messages` 配列そのもの**。他に隠された state は (基本的には) ない。

```
┌──────────────────────────────┐
│ クライアント (エージェント)    │
│                              │
│   messages = [...]  ←── state │
│                              │
│   毎ターン:                   │
│     1. user メッセージを push  │
│     2. agent.invoke(messages) │
│     3. 結果の messages を代入  │
└──────────────────────────────┘
              │
              ▼  LLM に毎回配列を丸ごと送る
         ┌─────┐
         │ LLM │  ← 完全ステートレス。
         └─────┘    前回の記憶なし。
```

LLM 側が状態を持っていないので、**クライアントが `messages` をどう育てるかがそのまま「エージェントが何を覚えているか」になる**。`messages` に入れ忘れたら LLM は知らない。`messages` から消したら LLM は忘れる。`messages` に嘘を書き足したら LLM はそれを事実だと思って応答する。

### agent-demo の対話モードで起きていること

`examples/agent-demo/src/agent-chat.ts` がこの state 管理の最小実装:

```typescript
let messages: any[] = [];        // ← これが state

while (true) {
  const userInput = await rl.question("you> ");
  if (userInput === "/exit") break;

  messages = [...messages, { role: "user", content: userInput }];  // ① user を追加

  const result = await agent.invoke(                               // ② LLM に送る
    { messages },
    { callbacks: [langfuse] }
  );

  messages = result.messages;   // ③ 結果で state を丸ごと置き換え
}
```

③ が少し面白い。LangChain の `agent.invoke` は「このターンで起きた全 message (assistant の tool_calls、tool 結果、assistant の最終応答まで)」を含んだ配列を返してくるので、クライアントは**差分をマージする必要がなく、丸ごと代入すれば次ターンの state ができあがる**。

## state の永続化の選択肢

「プロセスが死んだら state が消える」のはデモ用途なら許容できるが、本番では persist したいことが多い。選択肢は役割で分けるとこう:

| 方式 | 永続性 | 用途 | これは「本物の state」か |
|---|---|---|---|
| **プロセス内変数** | プロセス終了で消える | 最小構成 / デモ / 一時的スクリプト | ◯ |
| **Redis / KV store** | 永続 (TTL 設定可) | セッション単位の会話継続 / 軽量な読み書き | ◯ |
| **RDB (Postgres 等)** | 永続 | 構造化データ / 長期保存 / トランザクション | ◯ |
| **LangGraph checkpointer** | 永続 | LangGraph エージェントの状態スナップショット (messages + 内部 state) | ◯ |
| **Vector DB (Qdrant 等)** | 永続 | 意味検索で過去会話を取り出す「長期記憶」 | ◯ (アプリが retrieval で戻すなら) |
| **Langfuse のセッション** | 永続 (トレース保持期間) | **観測 / 可視化 / 評価のためのグルーピング** | **✗ (後述)** |

上の 5 つは「次ターンで `messages` として読み直せる」ものなので本物の state。**Langfuse は 1 つだけ役割が違う**ので、ここで節を分けて説明する。

## Langfuse のセッションは state ではない

`agent-chat.ts` で `CallbackHandler` に `sessionId` を渡しているのを見て「これで会話が覚えられるのか?」と思うかもしれないが、**それは state ではなく、観測 (ログ / トレース) のグルーピング**。

```typescript
const langfuse = new CallbackHandler({
  sessionId: `agent-chat-${Date.now()}`,  // ← Langfuse の UI でトレースをまとめるタグ
  tags: ["agent-demo", "interactive"],
});
```

### sessionId がしていること

- エージェントが LLM を叩くたびに、**バックグラウンドで**観測データ (トレース / span / 入出力) を Langfuse サーバに送っている
- その送信データに「このトレースは session=agent-chat-1775... に属する」というメタデータタグを付ける
- Langfuse UI では Sessions タブで同じ sessionId を持つトレース群を時系列でまとめて閲覧できる
- コスト / レイテンシ / ターン数がセッション単位で集計される

### sessionId が絶対にしないこと

- **LLM は sessionId の存在を知らない** (入力に渡っていない)
- **sessionId から過去のメッセージが自動で prompt に差し込まれない**
- **sessionId があれば `messages` を省略できるわけではない**
- **「同じセッションだから前の会話を覚えてくれる」は嘘**

つまり Langfuse にとっての session は「**同じ会話に属するトレースをひとまとめに見るためのラベル**」で、**LLM 側の記憶には一切影響しない**。

### 並べて比較するとこう

| 項目 | 本物の state (messages) | Langfuse のセッション |
|---|---|---|
| 何者か | クライアントが持つ配列 | トレース DB に付けるタグ |
| LLM への影響 | **ある** (入力そのもの) | **ない** (LLM には届かない) |
| 書き込みタイミング | 毎ターンの push / 置換 | 毎 API 呼び出し時にバックグラウンド送信 |
| 読み出す用途 | 次の `agent.invoke` の入力 | 人間が UI で後から見る / 評価する |
| 消えるタイミング | プロセス終了 (永続化してなければ) | Langfuse の保持期間まで永続 |
| 役割 | エージェントの記憶 | エージェントの観測 |

ちなみに**理論的には**、アプリ側が Langfuse の API を叩いて過去トレースを取得し、そこから `messages` を復元して次のリクエストに混ぜる、という変則的な使い方はできる。でもそれは「トレース DB を state ストアとして二次利用する」ハックで、通常は Redis / Postgres / checkpointer といった**目的に合ったストレージ**を使うのが筋。

## state と [第 3 章 コンテキストウィンドウ](03-tokens-context.md) の関係

state (= messages 配列) は**ターンごとに育ち続ける**ので、放置すると context window を食いつぶす:

```
ターン 1: [system, user, assistant]                    =  ~200 トークン
ターン 2: [system, user, assistant, user, assistant]   =  ~500 トークン
ターン 10: ...                                          = ~5,000 トークン
ターン 100: ...                                         = ~50,000 トークン
ターン 200: context window 突破 → API エラー or 品質劣化
```

対処法は第 3 章で挙げた 4 パターン:

1. スライディングウィンドウ (古い messages から捨てる)
2. 要約圧縮 (古い messages を「これまでの要約」に置き換える)
3. 選択的保持 (重要度で残すものを選ぶ)
4. RAG 外部化 (過去を Vector DB に退避)

**どれも state = messages 配列の書き換え**として実装される。LangGraph の `trim_messages` や LangChain 旧 API の `ConversationSummaryMemory` はこの操作を抽象化したヘルパ。

## state と [第 7 章 記憶の多層モデル](07-memory.md) の関係

- この章の state = 第 7 章の **L3 (コンテキスト注入)** そのもの
- L4 (外部ストレージ / 長期記憶) は、**state に明示的に読み戻さない限り LLM に届かない**
- 「永続化した state」と「長期記憶」は似ているようで位置が違う:
  - **永続化した state**: プロセスを跨いでも同じ messages 配列を使える (Redis, checkpointer 等)。**同じ会話の継続**
  - **長期記憶**: 別の会話のとき、過去の別会話から学んだ事実を retrieval で引き出す。**会話をまたいだ知識**

両者は組み合わせることもできる: **セッションごとの state は Redis に保存、ユーザ全体の長期記憶は Vector DB**、のように層を分ける。

## まとめ

- `messages` 配列 = `[{role, content}, ...]` の順序付きリスト
- role は `system` / `user` / `assistant` / `tool` の 4 種
- **1 ターン** = 1 つの user メッセージから次の user メッセージまで。内部で LLM は 1 〜 N 回呼ばれる
- **エージェントの state = クライアントが持つ `messages` 配列**。これが全て
- 永続化したいなら Redis / Postgres / LangGraph checkpointer / Vector DB から用途に応じて選ぶ
- **Langfuse のセッションは state ではなく観測用タグ**。LLM の記憶には関与しない
- state は育ち続けるので、[context window 対策](03-tokens-context.md) と切り離せない
- 「同じ会話の継続」と「会話をまたいだ長期記憶」は別の層として整理する ([第 7 章](07-memory.md))
