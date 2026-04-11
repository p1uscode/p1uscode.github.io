# セットアップ

homelab のインストールと構成リファレンス。`mise run up` で全サービスが立ち上がる状態までの手引き。

## 読む順番

初めて環境を作る場合は上から順に。既に動いている環境の調べ物であれば該当ファイルだけ開けば OK。

| # | ドキュメント | 内容 |
|---|---|---|
| 1 | [サービス構成](services.md) | ディレクトリ構成、サービス一覧、利用可能モデル |
| 2 | [初期設定](bootstrap.md) | 起動手順、`.env` の主な項目 |
| 3 | [mise の使い方](mise.md) | タスクランナー + 環境変数ローダーとしての mise |
| 4 | [DNS 設定](dns.md) | `*.home.arpa` の名前解決 (`/etc/hosts` / dnsmasq) |
| 5 | [Ollama (ホスト側導入)](ollama.md) | ローカル LLM ランタイム (クラウド LLM のみ使うなら不要) |
| 6 | [agent-demo](agent-demo.md) | LangChain ツールコールエージェントの install と設定リファレンス |

セットアップが終わったら [ハンズオン](../hands-on/README.md) で実際に触り、[座学](../theory/README.md) で仕組みを深掘りする。
