# Tool calling (function calling)

[第 3 章](03-messages-state.md) で `messages` 配列と 4 つの role を見た。この章では、その配列に `assistant` の `tool_calls` と `tool` role が入ってきたときに何が起きているか — **LLM に「外の道具を使う権利」を与える仕組み**を見る。

## まず最も大事な区別: 決めるのは LLM、叩くのはエージェント

Tool calling の話で一番ハマりやすいポイントを先に潰しておく。

**LLM 自身は外部システムに一切触れない**。Web を見ないし、ファイルを読まないし、計算もしない (推論モデルでも自前計算止まり)。LLM にできるのは**「この関数を、こういう引数で、呼んでほしい」という意思表示を JSON で出力する**ことだけ。

その JSON を受け取って**実際に関数を呼ぶのはエージェントプログラム (TypeScript / Python コード)**。ツール実行が終わったら、結果をまた文字列として `messages` に追加して、LLM に再度投げる。**LLM はその結果テキストを「読む」だけ**で、どうやって取れた値かは知らないし、関与もしない。

```
┌─────┐   1. 道具箱 (tools 配列) を渡す       ┌────────────┐
│     │ ◄──────────────────────────────────── │            │
│ LLM │                                       │            │
│     │   2. 「search('東京 天気') を呼んで」 │            │
│     │ ──────────────────────────────────► │            │
└─────┘                                       │ エージェント │
                                              │  プログラム  │
         ┌──────────────┐                     │            │
         │ [ツールガード]│ ◄───────────────── │            │   ここで実際に
         │  / 前処理    │  3. 検証して        │            │   fetch() を叩く、
         └──────┬───────┘     実行判断         │            │   DB に繋ぐ、
                ▼                              │            │   計算を走らせる
         ┌──────────────┐                     │            │
         │ 実ツール関数 │  4. 実行            │            │
         │ (fetch, sql, │ ────────────────►  │            │
         │  calc, ...)  │                     │            │
         └──────────────┘                     │            │
                │                              │            │
                ▼ 結果                         │            │
         (エージェントへ)                      │            │
                                               │            │
         ┌─────┐   5. 結果文字列を渡す       │            │
         │     │ ◄──────────────────────────── │            │
         │ LLM │                                └────────────┘
         │     │   6. 「答え: 晴れ、20 度」
         │     │ ─────────────────────────────► 人へ
         └─────┘
```

この分離が持つ意味:

- **LLM はシステムの外側に直接届かない**ので、ツールが無ければどれだけ賢くても日時 / 天気 / 最新情報 / 計算 / DB を扱えない ([第 0 章](00-overview.md) の話)
- **エージェント側は LLM の提案を拒否できる**。「このツールは呼ばない」「引数が不正だからエラーで返す」「権限がないから拒否する」といった判断は**全部エージェント側の責務**
- **道具の品質はエージェント側が握る**。LLM は呼ぶだけで、中身の実装精度・速度・信頼性は全部こちらの持ち物

## OpenAI 互換 API での表現

具体的にリクエスト / レスポンスの JSON を見る。

### 1. リクエストに `tools` を追加する

ツールが無いときのリクエストは `{model, messages}` だけだが、`tools` を足すとこうなる:

```json
{
  "model": "claude-sonnet-4-6",
  "messages": [
    { "role": "system", "content": "親切なアシスタント。必要なら道具を使え。" },
    { "role": "user",   "content": "今の時間を調べて、分に 15 をかけて。" }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "now",
        "description": "Return the current UTC time in ISO-8601 format.",
        "parameters": {
          "type": "object",
          "properties": {},
          "required": []
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "calc",
        "description": "Evaluate a pure arithmetic expression. Only digits and +, -, *, /, ( ) allowed.",
        "parameters": {
          "type": "object",
          "properties": {
            "expression": {
              "type": "string",
              "description": "Arithmetic expression."
            }
          },
          "required": ["expression"]
        }
      }
    }
  ]
}
```

`tools` は **LLM にとっての道具箱の宣言**。各ツールについて:

- `name`: 呼び出し時の識別子
- `description`: **このツールが何をするかを LLM に教える文章**。LLM はこの自然言語を読んで「今の状況でこのツールが役に立つか?」を判断する。**LLM が見るのはここだけ**
- `parameters`: JSON Schema 形式の引数仕様。LLM はこれに従った JSON を生成しようと頑張る

### 2. LLM が「このツールを呼びたい」と返してくる

上のリクエストに対して、LLM は次のような `assistant` メッセージを返す:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "now",
            "arguments": "{}"
          }
        }
      ]
    },
    "finish_reason": "tool_calls"
  }]
}
```

- `content` が `null` で、代わりに `tool_calls` 配列が来ている
- `id` はこの呼び出し 1 回を識別するユニーク ID。後で結果を返すとき「どの呼び出しへの応答か」を紐付けるのに使う
- `function.name` が `tools` で宣言した名前と一致している
- `function.arguments` が **JSON 文字列** (オブジェクトではなく、エスケープされた文字列) になっている点に注意
- `finish_reason` が `"tool_calls"` になっている ([第 1 章](01-llm-call.md) で触れた終了理由の 1 つ)

**ここで LLM の仕事は終わり**。実際に時刻を取得するわけではなく、「`now` を呼ぶべし」と書いた JSON を吐いて、次にエージェントに渡される。

### 3. エージェントがツールを実行して結果を戻す

エージェントプログラムは `tool_calls` を見てループを回す:

```typescript
// 擬似コード
for (const toolCall of assistant.tool_calls) {
  const tool = tools[toolCall.function.name];       // ツールを名前で引く
  const args = JSON.parse(toolCall.function.arguments);  // 引数をパース
  const result = await tool(args);                  // 実際に呼ぶ
  messages.push({
    role: "tool",
    tool_call_id: toolCall.id,                      // ← どの呼び出しへの応答か
    content: String(result),
  });
}
```

追加される `tool` メッセージはこんな形:

```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "2026-04-11T02:28:00.000Z"
}
```

### 4. 更新された messages で LLM を再度叩く

この時点で `messages` 配列はこうなっている:

```json
[
  { "role": "system", "content": "親切なアシスタント。必要なら道具を使え。" },
  { "role": "user",   "content": "今の時間を調べて、分に 15 をかけて。" },
  { "role": "assistant", "content": null, "tool_calls": [ { "id": "call_abc123", ... } ] },
  { "role": "tool", "tool_call_id": "call_abc123", "content": "2026-04-11T02:28:00.000Z" }
]
```

これを**まるごと再度 LLM に送る**。LLM は前回の tool_calls (自分が出した) と tool 結果 (エージェントから戻った) を読んで、**次にどうするか**を判断する:

- 十分な情報が揃った → 最終応答を `assistant` メッセージで返す (`finish_reason: stop`)
- もう 1 つツールが必要 → 別の `tool_calls` を返す (このケースなら `calc` を呼ぶ)
- 追加質問が必要 → テキストで質問を返す (ツール呼ばずに終わる)

上の例だと次は `calc` ツールを呼んで分 × 15 を計算してくる。その結果を同じように `tool` role で戻すと、今度は最終応答が返ってくる。この「tool_call → 実行 → 結果 → 再呼び出し」の繰り返しが**エージェントループ**で、次の [第 5 章](05-agent-loop.md) で詳しく扱う。

## agent-demo のコードとの対応

`examples/agent-demo/src/tools.ts` で `now` ツールを定義している部分を見るとこうなっている:

```typescript
export const nowTool = tool(
  async () => new Date().toISOString(),       // ① 実装: エージェント側が叩く関数
  {
    name: "now",                              // ② LLM に見える名前
    description:                              // ③ LLM に見える自然言語説明
      "Return the current UTC time in ISO-8601 format.",
    schema: z.object({}),                     // ④ 引数スキーマ (zod → JSON Schema に変換される)
  },
);
```

- ① の無名関数は **LLM には絶対に見えない**。エージェントが実行するときにしか使われない
- ② ③ ④ は LangChain が裏で OpenAI 互換の `tools` スキーマに変換し、LLM へのリクエストに載せる
- `z.object({...})` はランタイム時に JSON Schema へ変換 (`z.string().describe("...")` のようにすると `properties` の型と説明まで出る)

つまり**エージェントプログラム側は「実装」と「宣言」の両方を書く**。宣言は LLM への契約書、実装はエージェントが責任を持つ実行本体。

## 道具の品質がエージェントの品質

ここが実務で一番差が出るところ。**LLM の賢さとは別に、道具の良し悪しがエージェント全体の体感品質を決める**。具体的には次の 3 つが効く。

### (1) description が LLM の判断を決める

LLM は `description` の自然言語文字列だけを読んで「今これを呼ぶべきか」を決める。つまり:

- **description が曖昧** → LLM が使うべき場面で使わない、使わなくていい場面で呼ぶ
- **description が嘘** (実装と食い違い) → LLM は書いてある通りに使おうとして失敗する
- **description が具体的** → LLM の選択精度が上がる

悪い例: `"Process user query."` — 何を処理するのか分からない

良い例: `"Search the web via SearXNG. Use for up-to-date information or factual lookups that require data after the model's training cutoff."` — いつ使うか、何を返すかが具体的

### (2) 引数スキーマの厳密さがバグを減らす

JSON Schema にある程度の型と制約を書くと、LLM がトンチンカンな引数を生成したときに**エージェント側がパース時点で弾ける**。`z.string()` だけでなく `z.string().min(1).max(500)`、`z.number().int()`、`z.enum(["asc", "desc"])` 等で縛るほど、LLM の逸脱が減る。

### (3) 実装の精度と誤差が最終応答の精度

道具が嘘を返したら LLM は**嘘を真実として堂々と応答する**。SearXNG が壊れた JSON を返したら agent-demo の `search` ツールは例外を投げるが、もし「エラーなので適当な空配列を返す」と書いてあったら、LLM は「検索結果が無かったので分かりません」と言ってしまう。

- **計算ツール**: 整数の範囲外、浮動小数点誤差、オーバーフロー
- **検索ツール**: 結果数、取得可能な情報量、古い情報の混入
- **DB ツール**: トランザクション境界、読み取り一貫性、NULL ハンドリング
- **外部 API ツール**: レート制限、タイムアウト、エラー時の挙動

**エージェントの「この質問にどれだけ正確に答えられるか」は、LLM の性能 × ツールの精度の積**で決まる。LLM をいくら賢くしても、ツールが怪しいと体感品質は上がらない。逆にツール側を鍛え上げると、そこまで賢くない LLM でもかなり良い結果が出る。

## ツール呼び出しは「約束」。強制力はない

ここも混乱しがちなポイント。LLM が `tool_calls` を出したら、**エージェントは実行する義務はない**。あくまで「この道具を呼んでほしい」という提案でしかなく、エージェント側のコードが「呼ぶ / 呼ばない / 加工して呼ぶ / エラーで返す」を自由に決められる。

### 呼ばない (または加工する) ケースの例

- **ガード (後述)**: ポリシー違反の呼び出しをブロックする
- **権限チェック**: このユーザはこのツールを使っていいか? 使えなければ「権限なし」というエラーを tool メッセージとして返す
- **レート制限 / コスト上限**: 1 分に 10 回まで / 1 日に 100 円まで等を超えたら実行を止める
- **引数のサニタイズ**: LLM が投げてきた引数をエージェント側で書き換えてから実行する (例: 相対パスを絶対パスに変換)
- **ドライラン**: 開発中に「本当に実行する代わりにログだけ出す」
- **モック**: テスト時に実ツールを差し替える

重要なのは、**実行しなかった / 加工して実行した場合も、`tool` role のメッセージを「結果」として返す**こと。それを読んだ LLM は「なるほど、権限がなかったので別の方法で答えよう」と判断できる。エージェント側で勝手に握りつぶしたり、LLM に沈黙したままだと、LLM は `tool_calls` の結果が返ってこないことに困惑する。

## ガードの話 (軽めに)

エージェントの入出力に挟み込んで安全性を担保する層を**ガード (Guardrails)** と呼ぶ。Tool calling との関連では主にこの 4 箇所で働く ([第 0 章](00-overview.md) のアスキー図参照):

| ガードの位置 | 何をするか | 例 |
|---|---|---|
| **入力ガード** (人 → エージェント) | ユーザ入力の検査 | PII 除去、プロンプトインジェクション検知、不適切コンテンツ拒否 |
| **tool_calls ガード** (LLM → ツール実行前) | LLM が出した tool 呼出を検査 | 権限チェック、引数バリデーション、レート制限、危険なコマンド拒否 |
| **tool 結果ガード** (ツール実行後 → LLM) | ツールが返した結果を検査 | PII 除去、サイズ制限、機密情報のマスキング |
| **出力ガード** (LLM → 人) | 最終応答の検査 | 有害表現フィルタ、ファクトチェック、カテゴリ違反検知 |

ガードの実装は簡易なものなら正規表現や文字列マッチ、本格的なものなら別の LLM / 分類器 / 外部 API (OpenAI Moderation, Lakera, Azure Content Safety 等) を呼ぶ。

**agent-demo は学習用最小構成なのでガードは実装されていない**。本番で使うなら入力ガードと tool_calls ガードは最低限入れるのが普通。「LLM は任意のコマンドを生成できる」という前提で守りを組む。

## まとめ

- **LLM が決める。エージェントが叩く。**これが tool calling の根本的な役割分担
- LLM にとってのツールは「名前 + description + JSON Schema」というテキスト宣言でしかない
- 実装・実行・エラーハンドリング・セキュリティは**全部エージェント側の責任**
- LLM はリクエストに `tools` を受け取り、レスポンスの `tool_calls` で呼び出したいものを表明する。実行結果は `tool` role のメッセージとして `messages` に追加して再度 LLM に投げる
- `content: null` + `tool_calls` の assistant メッセージ → ツール実行 → `tool` メッセージ → 次の LLM 呼び出し という繰り返しが [第 5 章 エージェントループ](05-agent-loop.md) の本体
- **道具の品質 = description の具体性 + スキーマの厳密さ + 実装の精度**。ここがエージェントの体感品質を決める
- tool_calls は**約束でしかない**。エージェントは拒否 / 加工 / リトライ / モックを自由に選べる。ただし「何も返さない」は NG で、`tool` role のメッセージは必ず返す
- **ガード**は入力 / tool_calls / tool 結果 / 出力 の 4 箇所に挟み、安全性を担保する層。agent-demo では未実装
