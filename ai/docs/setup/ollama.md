# Ollama (ホスト側に導入)

> **クラウド LLM (OpenAI / Anthropic / Gemini) のみを使う場合は不要**。ローカルで LLM を走らせたいときだけ導入する。

Open WebUI の Ollama 統合 (`OLLAMA_BASE_URL=http://host.docker.internal:11434`) はホスト上で動くローカル LLM ランタイムに接続する前提。**コンテナではなくホストに直接インストール**する。

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

# 4. モデルを pull (例: Llama 3.1 8B)
ollama pull llama3.1:8b
ollama pull qwen2.5:7b

# 5. 動作確認
curl http://localhost:11434/api/tags
```
