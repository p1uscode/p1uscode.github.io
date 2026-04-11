# セットアップ

`mise run up` で全サービスが立ち上がる状態までの手引き。

## 前提プラットフォーム

**macOS (Apple Silicon) を前提に書いている**。具体的には以下を想定:

- `brew` でのパッケージインストール
- `launchctl` / `launchd` によるサービス常駐
- `/etc/hosts` および `dnsmasq` の配置先
- Ollama が Metal GPU を使う (Docker から Metal が見えないため、Ollama だけホストに直接入れる)

**Windows / Linux でもコアの部分 (Docker Compose + mise + uv + npm) は同じ**で動く。ただし以下は**読み替え / 代替が必要**:

- パッケージインストール: `brew` → `winget` / `scoop` / `apt` / `dnf` 等
- Ollama の GPU 利用: Windows / Linux なら Docker コンテナ版 Ollama + NVIDIA Container Toolkit、または vLLM に差し替え可
- DNS: `/etc/hosts` は Windows では `C:\Windows\System32\drivers\etc\hosts`、dnsmasq の代わりに `Acrylic DNS Proxy` 等
- `host.docker.internal` 経由の Ollama 接続: macOS/Windows は標準、Linux は Docker 側で `--add-host=host.docker.internal:host-gateway` が必要

各章の手順は macOS の具体コマンドで書いているが、**「何のためにやっているか」を読み取れば他 OS に置き換えできる**粒度になっている。

## 手順

| # | ドキュメント | 内容 |
|---|---|---|
| 1 | [サービス構成](services.md) | ディレクトリ構成、サービス一覧、利用可能モデル |
| 2 | [初期設定](bootstrap.md) | 起動手順、`.env` の主な項目 |
| 3 | [mise の使い方](mise.md) | タスクランナー + 環境変数ローダーとしての mise |
| 4 | [DNS 設定](dns.md) | `*.home.arpa` の名前解決 (`/etc/hosts` / dnsmasq) |
| 5 | [Ollama (ホスト側導入)](ollama.md) | ローカル LLM ランタイム (クラウド LLM のみ使うなら不要) |
