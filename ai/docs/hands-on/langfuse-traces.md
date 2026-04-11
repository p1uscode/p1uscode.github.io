# ハンズオン 2: Langfuse でトレースを読む

Open WebUI (or 他のクライアント) から LiteLLM を叩くと、裏で Langfuse にトレースが溜まっている。この章ではそれを**実際に UI で読み解く**練習をする。

## ゴール

- Langfuse の Traces 画面の基本的な使い方を覚える
- 1 つのトレースの中身 (input / output / usage / latency) を理解する
- Sessions タブの役割を把握する
- 「エージェントがおかしな動きをしたとき何を見るか」の入口を作る

## 事前準備

- [ハンズオン 1](open-webui.md) を実行済み (Langfuse にトレースが数件以上入っている)
- Langfuse のコンテナが起動している (`mise run up:langfuse`)

## 手順

### 1. Langfuse にログイン

<http://langfuse.home.arpa>

初回セットアップで自動プロビジョニング済みなら、次の資格情報でログイン:

- Email: `admin@home.arpa`
- Password: `password`

ログイン後、左メニューから **`homelab` 組織 → `default` プロジェクト**を選ぶ。

### 2. Traces タブを開く

左メニューの **Traces** をクリック。時系列に近い順で並んだトレース一覧が表示される。

ハンズオン 1 で投げた質問が複数行並んでいるはず。各行は 1 つの LiteLLM 呼び出し (= `litellm-acompletion` という名前の trace)。

### 3. 1 つ選んで開く

適当なトレースをクリックすると詳細画面が開く。見るべき箇所:

**左側の木構造**

- ルートの `litellm-acompletion` 1 件だけ (Open WebUI からの直接呼び出しはフラット)
- agent-demo から実行すると `LangGraph` を親に複数の子 span が並ぶ ([ハンズオン 4](agent-demo.md))

**中央の Input / Output**

- Input: `messages` 配列がまるごと表示される (system / user / assistant / tool)
- Output: LLM が返した `assistant` メッセージ (content or tool_calls)
- **これが [theory 01 LLM の 1 回の呼び出し](../theory/01-llm-call.md) で書いた JSON の実体**

**右側のメタデータ**

- Model: 実際に使われたモデル名
- Latency: 何 ms かかったか
- Cost: LiteLLM が計算した課金額 (トークン × 単価)
- Tokens: prompt / completion / total

### 4. 同じ質問を別モデルで投げたトレースと比較

ハンズオン 1 で Gemini と Claude で同じ質問を投げた場合、両方のトレースを並べて:

- **トークン数の違い**: モデルによってトークナイザが違うので同じ文字列でも数が違う
- **レイテンシの違い**: Gemini Flash は速い、Claude Sonnet / Opus は遅い
- **コストの違い**: モデル単価 × トークン数

これが [theory 02 トークンとコンテキストウィンドウ](../theory/02-tokens-context.md) で書いた「モデル間でトークン数がずれる」の実機確認。

### 5. 複数ターンの会話を Traces で追う

ハンズオン 1 の手順 7 (マルチターン会話) の場合、`litellm-acompletion` が **2 件**並んでいるはず:

- 1 件目: 最初の質問 → TypeScript 説明
- 2 件目: 「さっきの話を子供向けに」 → 2 件目の Input には**1 件目の user/assistant も含まれている**

2 件目の Input を開いて `messages` を確認すると、messages 配列に過去のやり取りが全部詰まっていることが確認できる。これが「state = messages 配列」の目で見える形 ([theory 03](../theory/03-messages-state.md))。

### 6. Sessions タブ

左メニューの **Sessions** をクリック。

Open WebUI からの呼び出しには `sessionId` が付いていないので Sessions タブには出てこない (= None 扱い)。

agent-demo を実行するとこのタブに「agent-demo-xxx」のエントリが並ぶ ([ハンズオン 4](agent-demo.md))。session ごとに全トレースがまとめて見える = マルチターン対話を 1 画面で追える。

### 7. Dashboard を覗く

左メニューの **Dashboard**。

- 時系列のリクエスト数 / トークン数 / コスト
- モデル別の使用量
- 失敗率

触っただけなのでまだデータ量は少ないが、本番では「このユーザだけコストが跳ねた」「この時間帯にエラーが増えた」といった異常検知の入口になる。

### 8. フィルタしてみる

Traces タブで上部のフィルタ条件に `tags` contains `User-Agent: langchainjs-openai` を入れると、agent-demo からのトレースだけに絞り込める (agent-demo はまだ動かしていないので結果 0 件のはず。ハンズオン 4 でもう一度試す)。

`tags` は任意の文字列なので、本番では `environment:production` / `experiment:variant-a` のような使い方をする。

### 9. デバッグ視点で眺める

本番でエージェントがヘンな応答をしたとき、Langfuse でやることは [theory 07 Observability](../theory/07-observability.md) のデバッグ手順そのもの:

1. 該当時間帯 + ユーザ / セッション で絞り込む
2. 木を開いて duration の長いところ / エラーのあるところを見つける
3. 各 LLM 呼び出しの input `messages` を上から読んで、どのタイミングで論点がズレたか探る
4. tool_calls の引数と結果を見る
5. 必要なら Playground で別モデル or 別プロンプトで再実行

今はまだ agent-demo が動いていないのでこの練習は [ハンズオン 4](agent-demo.md) で改めて。

## 観察できた現象の対応章

| 観察 | 対応する座学 |
|---|---|
| `messages` 配列が Input に丸ごと入っている | [03 Messages と state](../theory/03-messages-state.md) |
| モデルごとにトークン数が違う | [02 トークンとコンテキストウィンドウ](../theory/02-tokens-context.md) |
| Langfuse のセッションはタグであって state ではない | [03 Messages と state](../theory/03-messages-state.md) の Langfuse session セクション |
| trace / span の親子構造 | [07 Observability](../theory/07-observability.md) |
| sessionId / userId / tags の使い分け | [07 Observability](../theory/07-observability.md) |

## 次

次は**もう 1 層下**を覗く。LiteLLM が実際にプロバイダに送っている生 HTTP を mitmproxy で見る: [mitmproxy で生の LLM 通信を覗く](mitmproxy.md)。
