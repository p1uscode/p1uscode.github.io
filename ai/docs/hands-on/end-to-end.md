# ハンズオン 5: End-to-end で 1 つの質問を追う

**同じ質問**を Open WebUI 経由と agent-demo 経由の両方で投げて、システム全体でデータがどう流れたかを一望する。

## ゴール

- 「人間 → UI → プロキシ → LLM → プロバイダ → 観測」の全レイヤを 1 つの質問で一気に追う
- LLM 単体とエージェントの**出力の差**を体感する
- どのレイヤがどの情報を持っているかを把握する (デバッグ時の切り分け力)

## 題材の質問

```
今の UTC 時刻を調べて、その「分」の数字に 12 を足した結果を教えてください。
```

この質問は:

- **時刻を知る必要がある** → LLM 単体では無理 → エージェントなら `now` ツールで解決
- **簡単な計算が必要** → LLM 単体でもできるが、`calc` ツールが正確
- **複数ステップの連鎖** → エージェントループの好例

## 事前準備

- 全サービスが起動 (`mise run up`)
- agent-demo がインストール済み (`mise run agent:ci`)
- [ハンズオン 1-4](README.md) を全部終えている状態が理想 (各画面の使い方を知っている)

## Phase 1: Open WebUI (LLM 単体)

### ステップ 1-1. Open WebUI で投げる

<http://open-webui.home.arpa> を開き、モデルを**自分の環境で使える任意のモデル** (API キーを設定したクラウドモデル、または `ollama/*` として LiteLLM に登録したローカルモデル) に設定して、題材の質問をそのまま投げる。どれでも観察ポイントは同じ。

### ステップ 1-2. 応答を観察

- 多くのモデルは**現在時刻を知らない**ので、「私はリアルタイムの時刻にアクセスできません」等と返すはず
- または**学習カットオフ時点や会話開始時刻を推測**して答えようとするかもしれない (不正確)
- いずれにせよ**ツールが無い LLM 単体では正確には答えられない**

ここで押さえておきたいのは、**Open WebUI 自体もツール機能を持っている**こと。
設定でツールを有効化できる。有効にすると Open WebUI が LLM に対してツールスキーマを渡し、LLM が `tool_calls` を返すと Open WebUI 側でツールを実行し、結果を messages に追記して LLM を再度叩く — つまり **agent-demo がやっているエージェントループと同じ仕組み**が Open WebUI の内部で回る。

このハンズオンではあえて**ツールを有効にしないプレーンな単発 chat** で Phase 1 を動かしている。同じことが ChatGPT / Claude.ai / Gemini の公式 Web チャットにも当てはまり、「最新情報を検索してくれた」「Python で計算してくれた」と感じる場面も**プロバイダ側がホストしているツールの tool_calls ループ**であって、仕組みとしては agent-demo と同じ。逆に言うと、どのフロントも `tools` フィールドを外して叩けば「時刻を知らない」プレーンな LLM に戻る。

### ステップ 1-3. Langfuse で確認

<http://langfuse.home.arpa> の Traces を開き、今投げたリクエストのトレースを確認。

- `litellm-acompletion` という単一トレース
- `tool_calls` は無し (ツールを提供していないので呼びようがない)
- レスポンスの content はそのまま最終応答
- usage / cost / latency を把握

### ステップ 1-4. mitmproxy で生 API を見る (オプション)

<http://mitmproxy.home.arpa> で、LiteLLM がプロバイダに投げた生の HTTPS リクエストを確認:

- `tools` フィールドは無い
- `messages` は system prompt + user 質問の 2 件
- レスポンスは `content` に自然言語テキストだけ

**結論**: Phase 1 では「LLM は時刻を知らない」を実証。正解は得られなかった。

## Phase 2: agent-demo (エージェント)

### ステップ 2-1. 単発モードで同じ質問を投げる

```sh
mise run agent-single -- "今の UTC 時刻を調べて、その「分」の数字に 12 を足した結果を教えてください。"
```

### ステップ 2-2. 応答を観察

今度は正しい数字が返るはず:

```
現在の UTC 時刻は 03:42:XX です。分の 42 に 12 を足すと 54 になります。
```

- 時刻が正確
- 計算が正確
- 「分の数字」という曖昧な表現を解釈して抽出している

### ステップ 2-3. Langfuse で階層トレースを見る

Traces タブで最新のトレースを開く。今度は木構造:

```
LangGraph (root, 親 span)
├─ ChatOpenAI (iter 1)         ← LLM が「now を呼ぼう」と判断
├─ tool: now                    ← "2026-04-11T03:42:15.000Z"
├─ ChatOpenAI (iter 2)         ← LLM が「calc を呼ぼう」と判断 (分を抽出して 42 + 12)
├─ tool: calc                   ← "54"
└─ ChatOpenAI (iter 3)         ← 最終応答生成
```

各 span をクリックして**中身の遷移**を確認:

- iter 1 の Input: system + user だけ
- iter 1 の Output: content=null, tool_calls=[now]
- tool `now` の Input: {} / Output: ISO 時刻文字列
- iter 2 の Input: system + user + 前の assistant + 前の tool 結果
- iter 2 の Output: content=null, tool_calls=[calc("42+12")]
- ... という具合

**これが [theory 06 エージェントループ](../theory/06-agent-loop.md) の messages 配列が育っていく様子の実機確認**。

### ステップ 2-4. mitmproxy で API を見る (オプション)

mitmweb を見ると、Phase 1 より**多くのリクエスト**が並んでいる:

- iter 1 の LLM 呼び出し (tools スキーマ付き)
- (now ツールは HTTP を叩かないので mitmproxy には現れない)
- iter 2 の LLM 呼び出し (tool 結果を含む messages)
- iter 3 の LLM 呼び出し (最終応答)

各リクエストの Body を開くと、**ネイティブ API 形式でのツールスキーマと tool_calls**が見える。[ハンズオン 3](mitmproxy.md) の内容の具体例。

## Phase 3: 差分を比較する

### 結果の比較

| 観点 | Phase 1 (Open WebUI 単体) | Phase 2 (agent-demo) |
|---|---|---|
| 答えの正確性 | ✗ (時刻は分からない) | ✓ (ツールで正確) |
| LLM 呼び出し回数 | 1 | 3 (iter 1/2/3) |
| ツール実行 | 0 | 2 (now + calc) |
| 合計レイテンシ | 短い (1-3 秒) | 長い (3-10 秒) |
| 合計コスト | 小さい (1 呼び出し分) | 大きい (3 呼び出し分) |
| Langfuse の trace 構造 | 1 個の独立 trace | 階層 span 付きの 1 trace |

### どのレイヤがどの情報を持っているか

| 情報 | 持ち場 |
|---|---|
| ユーザが何を聞いたか | Open WebUI / agent-demo の messages |
| LLM がどう判断したか | Langfuse の各 `ChatOpenAI` span の Input / Output |
| LLM に何を渡したか (`messages` 全体) | Langfuse の Input / mitmproxy の生リクエスト |
| プロバイダが何を返したか (生) | mitmproxy の生レスポンス |
| トークン / コスト / レイテンシ | Langfuse の usage / cost / latency |
| 実際のツール戻り値 | Langfuse の tool span の Output |
| エージェント外側の state (messages 配列) | クライアントコードのメモリ (agent-demo のプロセス内) |

**トラブル対応時はこの対応表を元に切り分ける**:

- 「応答が変」 → Langfuse で最終 `ChatOpenAI` の Output を確認
- 「ツールが呼ばれない」 → system prompt と tool description を確認 (Langfuse Input)
- 「LiteLLM が壊れたレスポンスを返す」 → mitmproxy で生レスポンスを確認
- 「途中で何かがズレた」 → Langfuse で各 iteration の messages を上から読む

## Phase 4: 別角度で試す

余裕があれば、次も試してみる:

### バリエーション A: ツールを絞る

```sh
AGENT_TOOLS=now mise run agent-single -- "今の UTC 時刻を調べて、その「分」の数字に 12 を足した結果を教えてください。"
```

`calc` が無い状態で LLM に計算させる。推論モデルなら正答するが、エージェントトレースは短くなる (iter 2 の calc が無い)。

### バリエーション B: モデルを変える

```sh
AGENT_MODEL=gemini-2.5-flash mise run agent-single -- "..."
```

Gemini Flash は速いがレスポンスの言い回しが違う。Langfuse で model フィールドが変わっていることを確認。

### バリエーション C: 対話モードで同じ質問を追加質問付きで

```sh
mise run agent-chat
```

```
you> 今の時間を知りたい
you> (LLM が「UTC ですか、JST ですか」等と聞いてきたら) UTC で、分の数字に 12 を足した結果を教えて
you> ありがとう
```

対話モードでは 1 ターン目に LLM が追加質問で返す可能性が高い。その後の会話が session としてまとまって Langfuse に記録される。

## まとめ

このハンズオンで体感したこと:

1. **LLM 単体とエージェントの実力差**はツールの有無で生じる
2. **どのフロント (Open WebUI / ChatGPT / Claude.ai / Gemini / 自前 agent-demo) も内部はエージェントループ**。ツールを渡せば同じ仕組みで tool_calls → 実行 → 再問い合わせが回る。違いは「誰がツールをホストしているか」「ユーザがどこまで制御できるか」だけ
3. **各レイヤ** (UI / プロキシ / LLM / ツール / 観測) が違う情報を持っている
4. **Langfuse の階層トレース**がエージェントの挙動を一望させる
5. **mitmproxy の生 HTTP**は LiteLLM の翻訳レイヤの出力を確認する最後の砦
6. **デバッグの切り分け**はレイヤ別に Langfuse / mitmproxy / クライアントログを使い分ける

## 対応する座学

このハンズオンは横串の総合演習なので、対応する章が多い:

- [01 登場人物と責任範囲](../theory/01-overview.md) — 各アクターの役割
- [02 LLM の 1 回の呼び出し](../theory/02-llm-call.md) — Open WebUI 単発の実体
- [04 Messages と state](../theory/04-messages-state.md) — messages 配列が育つ様子
- [05 Tool calling](../theory/05-tool-calling.md) — tool_calls の往復
- [06 エージェントループ](../theory/06-agent-loop.md) — 3 iter の連鎖
- [08 Observability](../theory/08-observability.md) — 階層 span の読み方
- [17 エンジニアリングの 3 層](../theory/17-engineering-layers.md) — 切り分けの視点
