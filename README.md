# p1uscode

自作 lab のモノレポ兼 [p1uscode.com](https://p1uscode.com) の静的サイトソース。

## Labs

- [ai/](ai/docs/index.md) — ローカルで動く AI スタック (LLM / エージェント / 観測 / RAG / マルチモーダル) を題材に、仕組みを手を動かして理解するための実験環境

## サイトを手元で確認

MkDocs Material で全 lab を 1 サイトにまとめている。ツールチェーンは **mise + uv** で固定管理 ([.mise.toml](.mise.toml) / [pyproject.toml](pyproject.toml))。

```bash
# 初回のみ: Python / uv をインストール + 依存同期
mise install
mise run docs-sync

# 開発サーバ起動 (http://127.0.0.1:8000、ファイル変更で自動リロード)
mise run docs-serve
```

静的ファイルを生成したい場合は `mise run docs-build` (出力は `site/`、gitignore 済み)。設定は [mkdocs.yml](mkdocs.yml) を参照。
