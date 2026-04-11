# ハンズオン 4: agent-demo を動かす

ここまで触ってきた Open WebUI / Langfuse / mitmproxy は「LLM 単体」の世界。この章では**エージェント** — ツールを呼べる主体 — を実際に動かす。

## ゴール

- 単発モード / 対話モードの両方を実行する
- LLM がツールを呼ぶ / 呼ばない / 連鎖する様子を実機で観察
- Langfuse のトレースで**階層的な span 構造**を確認
- `AGENT_TOOLS` / `AGENT_BACKEND` / `AGENT_MODEL` を切り替えて挙動の違いを体感

## 事前準備

- [setup/agent-demo](../setup/agent-demo.md) の「インストール」まで完了している (`mise run agent:ci` 済み)
- SearXNG の JSON API が有効化されている (setup/agent-demo.md の「前提」参照)
- `mise run up` で全サービスが起動している

## 手順

### 1. 最初の実行 (静的な質問)

ツールが不要な質問から:

```sh
mise run agent-single -- "富士山の高さは?"
```

出力の冒頭に:

```
[agent-single] backend=litellm model=claude-sonnet-4-6 tools=[search, fetch_url, wikipedia, now, calc, random_int, end_chat]
```

が出て、続けて最終応答が返る。

**観察**:

- ツール 7 個を LLM に宣言しているが、**この質問ではどれも呼ばれていない** (富士山の高さは学習済み事実だから)
- [theory 00](../theory/00-overview.md) の Q6 "富士山の高さ" の実機確認

### 2. ツールを呼ばせる質問

```sh
mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

**観察**:

- 応答内で「現在時刻 XX:XX、分 YY × 15 = ZZZ」のような形で返る
- 裏で `now` → `calc` の 2 ツール連鎖が起きている (Langfuse で確認する)
- [theory 05 エージェントループ](../theory/05-agent-loop.md) の具体例

### 3. Langfuse でトレースを見る

[ハンズオン 2](langfuse-traces.md) の要領で <http://langfuse.home.arpa> を開き、Traces を確認。

今回は `LangGraph` という親 trace に加えて:

- `LangGraph` (root)
  - `ChatOpenAI` (iteration 1: 時刻を知るため `now` を呼ぶ判断)
  - `now` (tool 実行、結果 ISO 時刻)
  - `ChatOpenAI` (iteration 2: 分を計算するため `calc` を呼ぶ判断)
  - `calc` (tool 実行、結果数値)
  - `ChatOpenAI` (iteration 3: 最終応答生成)

のような木構造で span が並ぶ。これが [theory 07 Observability](../theory/07-observability.md) の**階層 span の実体**。

各 span をクリックすると、Input/Output に messages 配列や tool 引数が入っているのが見える。

### 4. 並列 tool_calls を誘発してみる

複数の独立した情報を同時に聞くと、LLM が 1 回のレスポンスで複数 `tool_calls` を返すことがある:

```sh
mise run agent-single -- "TypeScript と Python の Wikipedia 記事の要約を両方教えて"
```

Langfuse のトレースで 2 つの `wikipedia` tool 実行が**並列**に走っているか確認できる (timestamps を見ると同じタイミングで start している)。[theory 05](../theory/05-agent-loop.md) の「並列ツール呼び出し」の節。

### 5. ツール絞り込み

`search` と `now` だけ有効にして、同じ質問を投げる:

```sh
AGENT_TOOLS=search,now mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

**観察**:

- ツール一覧に `[search, now]` だけ表示される
- `calc` が使えないので、LLM は自分で 15 倍を計算する (推論モデルなら正答、そうでなければ間違える可能性)
- [theory 04 Tool calling](../theory/04-tool-calling.md) で書いた「道具の品質と LLM 能力の掛け算」の実機確認
- [theory 00](../theory/00-overview.md) の Q3 (計算) の文脈で、**ツールの有無が精度と確実性に直結する**

### 6. モデルを変えてみる

```sh
AGENT_MODEL=gemini-2.5-flash mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

Langfuse でトレースを見ると、`ChatOpenAI` span の Model メタデータが Gemini になっている。モデルを変えてもツール呼び出しの手順はほぼ同じ (LLM の判断は異なるかもしれない)。

### 7. Ollama バックエンド (オプション)

ローカルの Ollama をホストで動かしているなら:

```sh
AGENT_BACKEND=ollama AGENT_MODEL=qwen3.5:35b mise run agent-single -- "今の時間を調べて、その分に 15 をかけて"
```

- レスポンスは遅い (ローカル推論)
- Langfuse には飛ばない (Ollama に Langfuse 統合は無い。agent-demo 側のトレーシングは有効なので `LangGraph` span は残る)
- 小さいモデルだと tool_calls 後の最終応答が空になることがある ([theory 04](../theory/04-tool-calling.md) の注意点)

### 8. 対話モードを試す

```sh
mise run agent-chat
```

readline のプロンプト (`you>`) が出るので、以下を順に入力:

```
おすすめを教えて
```

**観察**:

- LLM は曖昧すぎると判断して**追加質問を返す**はず ("どのカテゴリのおすすめ? 映画? 本?")
- **ツールを呼んでいない**こと ([theory 12 system prompt](../theory/12-system-prompt.md) の think-before-act)

続けて:

```
映画
```

今度は LLM がジャンル等を聞いてくるか、具体的なおすすめを返すか、モデル次第。

何ターンか続けたあと:

```
ありがとう、参考になった
```

LLM が `end_chat` ツールを呼んで会話が自動終了するはず:

```
[chat ended by agent: conversation complete]
```

これが [theory 05 エージェントループ](../theory/05-agent-loop.md) の「明示的な終了シグナル」の実機。

### 9. 対話モードのトレースを Sessions で見る

Langfuse の **Sessions** タブを開くと、今の対話が 1 つの session としてまとまっている (`agent-chat-xxxxxxx`)。

中を開くと、各ターン (= 1 つの `LangGraph` trace) が時系列で並び、全体のターン数 / 総コスト / 総 duration が 1 画面で見える。これが [theory 03](../theory/03-messages-state.md) で書いた「観測軸のグルーピング」として機能する瞬間。

### 10. `tags=agent-demo` で絞り込み

Traces タブに戻って、フィルタに `tags` contains `agent-demo` を入れると、このハンズオンで作ったトレースだけが残る。本番では tag で環境 / 実験 / バージョンを切り分けるのと同じ要領 ([theory 07](../theory/07-observability.md))。

## 観察できた現象の対応章

| 観察 | 対応する座学 |
|---|---|
| ツール一覧の宣言 (tools スキーマ) | [04 Tool calling](../theory/04-tool-calling.md) |
| LLM がツールを呼ぶ判断 | [04 Tool calling](../theory/04-tool-calling.md) "決めるのは LLM" |
| 階層 span (LangGraph → ChatOpenAI → tool) | [07 Observability](../theory/07-observability.md) |
| 並列 tool_calls | [05 エージェントループ](../theory/05-agent-loop.md) |
| ツール絞り込みと LLM 能力の関係 | [04 Tool calling](../theory/04-tool-calling.md) "道具の品質" |
| 対話モードでの追加質問 (ツール呼ばず) | [12 system prompt の設計](../theory/12-system-prompt.md) |
| end_chat による自動終了 | [05 エージェントループ](../theory/05-agent-loop.md) "明示的な終了シグナル" |
| Sessions タブでの対話まとめ | [03 Messages と state](../theory/03-messages-state.md), [07 Observability](../theory/07-observability.md) |

## 次

最後のハンズオンでは、1 つの質問を Open WebUI → LiteLLM → Langfuse → agent-demo とシステム全体で**横断的に追う**: [End-to-end: 1 つの質問をシステム全体で追う](end-to-end.md)。
