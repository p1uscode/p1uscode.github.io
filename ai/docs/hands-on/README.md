# ハンズオン

セットアップが終わって全サービスが立っている状態から、**実際に画面や CLI を触って動作を観察する**ための手引き集。座学 ([theory/](../theory/README.md)) と補完的で、どちらから始めても OK。

## 前提

以下が済んでいること:

- [setup/bootstrap](../setup/bootstrap.md) の手順で `mise run up` まで完了している
- [setup/dns](../setup/dns.md) で `*.home.arpa` が解決できる (ブラウザで <http://langfuse.home.arpa> 等にアクセスできる)
- `.env` に Langfuse の pk/sk と少なくとも 1 つの LLM API キー (OpenAI / Anthropic / Gemini) が入っている
- (agent-demo を試すなら) [setup/agent-demo](../setup/agent-demo.md) の「インストール」まで完了している

## ハンズオン一覧

下の順で試すと「人間 → Open WebUI → LiteLLM → LLM provider → Langfuse」のデータの流れが一周するようになっている。順番は前後しても OK。

| # | ハンズオン | 扱うサービス | かかる時間の目安 |
|---|---|---|---|
| 1 | [Open WebUI でチャット](open-webui.md) | Open WebUI, LiteLLM | 10 分 |
| 2 | [Langfuse でトレースを読む](langfuse-traces.md) | Langfuse | 15 分 |
| 3 | [mitmproxy で生の LLM 通信を覗く](mitmproxy.md) | mitmproxy, LiteLLM | 10 分 |
| 4 | [agent-demo を動かす](agent-demo.md) | agent-demo, Langfuse | 20 分 |
| 5 | [End-to-end: 1 つの質問をシステム全体で追う](end-to-end.md) | 全部 | 20-30 分 |

各ハンズオンは**完了すると「ああ、この章で読んだ話はここで起きていたのか」と腑に落ちる**ように、対応する座学を末尾で示している。
