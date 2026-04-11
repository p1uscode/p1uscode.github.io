# Ollama (ホスト側に導入)

> **クラウド LLM (OpenAI / Anthropic / Gemini) のみを使う場合は不要**。ローカルで LLM を走らせたいときだけ導入する。

ai lab では Ollama を **LiteLLM 経由** (`ollama/*` wildcard ルート) で全クライアント共通に叩く。LiteLLM コンテナが `host.docker.internal:11434` に抜けられるよう `OLLAMA_BASE_URL=http://host.docker.internal:11434` が `.env` に入っている。**コンテナではなくホストに直接インストール**する。

## なぜホストに入れるのか

- **Apple Silicon の Metal GPU はコンテナから見えない**。Docker Desktop は軽量 Linux VM 上で動くため、macOS の Metal / MPS バックエンドにアクセスできず、コンテナ内で Ollama を動かすと CPU 推論になって実用的な速度が出ない。
- ホスト直インストールなら Metal を直接叩けて、7B〜13B クラスのモデルでもリアルタイムにストリーミングできる。
- コンテナからは `host.docker.internal` でホストのポートに抜けられるので、ネットワーク的なデメリットも無い。

## インストール手順

```sh
# 1. Ollama 本体 (公式 installer)
brew install ollama

# 2. bind アドレスを 0.0.0.0 に広げる
#     (デフォルトは 127.0.0.1 のみで、Docker コンテナから host.docker.internal
#      経由で届かないため)
launchctl setenv OLLAMA_HOST 0.0.0.0:11434

# 3. サービス起動 (バックグラウンド常駐)
brew services start ollama

# 4. 動作確認 — (a) Ollama 直叩き
#    pull 済みモデルの一覧が返り、次に chat 推論が通ることを確認
curl http://localhost:11434/api/tags
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.5:9b","messages":[{"role":"user","content":"hi"}]}'

# 5. 動作確認 — (b) LiteLLM 経由
#    同じ応答が LiteLLM の `ollama/*` wildcard 経由でも返ることを確認
#    (LiteLLM コンテナが host.docker.internal:11434 に抜けられるかの検証も兼ねる)
curl http://litellm.home.arpa/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"ollama/qwen3.5:9b","messages":[{"role":"user","content":"hi"}]}'
```

## モデルの選び方

2026-04 時点の主要 open weights と提供元:

| ベンダー | モデルファミリー | 主要タグ | 特徴 |
|---|---|---|---|
| **Alibaba** | Qwen 3.5 | `qwen3.5:0.8b` 〜 `qwen3.5:122b` | dense、256K context、vision 対応、tool calling と日本語が安定 |
| **Alibaba** | Qwen 3 / Qwen 3-VL / Qwen 3-Coder | `qwen3:*`、`qwen3-vl:*`、`qwen3-coder:30b/480b` | 3.5 の前世代 + 特化版。`qwen3:30b` は MoE |
| **Meta** | Llama 4 (MoE) | `llama4:16x17b` (Scout 109B), `llama4:128x17b` (Maverick 400B) | MoE で activated 17B、vision 対応、2026 年のフラグシップ |
| **Meta** | Llama 3.3 | `llama3.3:70b` | dense 70B。Llama 3.1 405B 相当の品質 |
| **Meta** | Llama 3.1 / 3.2 | `llama3.1:8b/70b/405b`、`llama3.2:1b/3b` | 汎用 baseline、小型は 3.2 |
| **Google** | Gemma 4 / Gemma 3 / Gemma 3n | `gemma4:26b/31b`、`gemma3:270m` 〜 `gemma3:27b`、`gemma3n:*` | 4 が最新、3n は超軽量 (ラップトップ / スマホ) |
| **OpenAI** | gpt-oss | `gpt-oss:20b` (dense)、`gpt-oss:120b` (MoE) | OpenAI 公式 open weights、agentic / reasoning 寄り |
| **DeepSeek** | R1 / V3.2 / Coder-V2 | `deepseek-r1:1.5b` 〜 `:671b`、`deepseek-v3.2`、`deepseek-coder-v2:16b/236b` | R1 は reasoning 特化、V3.2 は 671B MoE の汎用 |
| **Mistral** | Mistral Small / Devstral | `mistral-small:24b`、`devstral-small-2:24b` | バランス型 / コード agentic |
| **Microsoft** | Phi 4 | `phi4:14b` | 小型で reasoning に強い |

### Mac スペック × モデルサイズ

4-bit 量子化時の目安。unified memory の **1/3 〜 半分** くらいが快適ライン (他アプリと同時使用する前提)。コンテキストを長く取るとさらにメモリを食うので余裕を持たせる。**MoE モデルは activated params が少ないので推論速度は速い**が、全 params をメモリに載せる必要があるため、ディスク / メモリ要件は dense と同じ。

| Mac メモリ | 快適サイズ | 起点モデル (迷ったらこれ) | 他の候補 |
|---|---|---|---|
| 8 GB | 1B-4B | `qwen3.5:4b` | `qwen3.5:0.8b/2b`、`llama3.2:3b` |
| 16 GB | 9B-14B | `qwen3.5:9b` | `llama3.1:8b` |
| 32 GB | 20B-35B | `qwen3.5:27b` / `qwen3.5:35b` | `gpt-oss:20b`、`deepseek-r1:32b`、`gemma4:26b` |
| 64 GB | 70B dense / Scout 級 MoE | `llama3.3:70b` | `qwen3.5:122b` (tight)、`llama4:16x17b`、`gpt-oss:120b` |
| 96 GB+ | 100B+ MoE 快適、特大も可 | `llama4:16x17b` | `gpt-oss:120b`、`deepseek-v3.2`、`llama4:128x17b` (245 GB) |

### 用途別の選び方

- **汎用 + tool calling**: Qwen 3.5 系。日本語精度も高く実務で安定
- **フロンティア品質**: 64 GB+ で `llama4:16x17b` / `gpt-oss:120b` / `qwen3.5:122b` / `deepseek-v3.2`
- **reasoning**: `deepseek-r1:*`。思考トークンを多用するので精度は高いが遅い
- **コード特化**: `qwen3-coder:30b`、`devstral-small-2:24b`、`qwen2.5-coder:32b`、`deepseek-coder-v2:*`
- **vision / マルチモーダル**: `qwen3-vl:*`、`qwen3.5:*` (256K で画像対応)、`llama4:*`
- **速度 / レイテンシ重視**: 9B 以下の dense (`qwen3.5:9b`、`llama3.1:8b`)
- **オンデバイス / 超軽量**: `gemma3n:*`、`qwen3.5:0.8b/2b`、`llama3.2:1b/3b`

### pull の例

```sh
# 16 GB Mac の起点
ollama pull qwen3.5:9b

# 32 GB なら
ollama pull qwen3.5:35b

# 64 GB なら
ollama pull llama3.3:70b
```

最新モデル / タグは <https://ollama.com/library> で要確認。

## LiteLLM の config.yaml に明示登録する (Open WebUI 用)

`services/litellm/config.yaml` には `ollama/*` の wildcard ルートが入っており、curl や agent-demo のように**モデル名を直接指定して呼ぶ**クライアントならこれだけで動く。

一方 **Open WebUI / Dify のような「モデル一覧をドロップダウンに出す」クライアントは wildcard を展開できない**ため、UI から選ぶには **pull したモデルを 1 件ずつ明示登録**する必要がある。

`services/litellm/config.yaml` の `model_list:` に追記:

```yaml
  # Ollama (明示登録。Open WebUI のドロップダウンに出すため)
  - model_name: ollama/qwen3.5:9b
    litellm_params:
      model: ollama_chat/qwen3.5:9b
      api_base: os.environ/OLLAMA_BASE_URL

  - model_name: ollama/llama3.3:70b
    litellm_params:
      model: ollama_chat/llama3.3:70b
      api_base: os.environ/OLLAMA_BASE_URL
```

反映:

```sh
mise run down:litellm && mise run up:litellm
```

これで Open WebUI のモデル選択メニューに `ollama/qwen3.5:9b` 等が並ぶ。wildcard ルートは残したままで良い (明示エントリが優先的にマッチし、未登録タグは wildcard で拾われる)。
