# DNS

全サービスは `*.home.arpa` ドメインで動作する。Traefik がポート80で受けてホスト名でルーティングするため、**サービス起動前にいずれかのDNS設定が必要**。

## オプション1: /etc/hosts (このMacのみ・シンプル)

サービスごとに1行ずつ追加する。他デバイスからのアクセスは不可。

```sh
sudo sh -c 'cat >> /etc/hosts << EOF
127.0.0.1 traefik.home.arpa
127.0.0.1 dify.home.arpa
127.0.0.1 litellm.home.arpa
127.0.0.1 open-webui.home.arpa
127.0.0.1 mitmproxy.home.arpa
127.0.0.1 langfuse.home.arpa
127.0.0.1 searxng.home.arpa
127.0.0.1 qdrant.home.arpa
127.0.0.1 n8n.home.arpa
EOF'
```

## オプション2: dnsmasq (ワイルドカード・他デバイス対応)

`*.home.arpa` を一括解決できる。スマホや別PCからもアクセス可能。

```sh
# 1. インストール
brew install dnsmasq

# 2. 設定ファイル編集
#    <HOST_IP> はこのMacのローカルIP (ifconfig | grep "inet " | grep -v 127 で確認)
sudo vi $(brew --prefix)/etc/dnsmasq.conf
```

```
bind-interfaces
listen-address=127.0.0.1,<HOST_IP>
address=/.home.arpa/<HOST_IP>
server=8.8.8.8
```

```sh
# 3. サービス起動 (/Library/LaunchDaemons に登録される)
sudo brew services start dnsmasq

# 4. macOS リゾルバー設定
sudo mkdir -p /etc/resolver
sudo sh -c 'echo "nameserver 127.0.0.1" > /etc/resolver/home.arpa'

# 5. 動作確認 (<HOST_IP> が返れば OK)
dig +short test.home.arpa @127.0.0.1
```

**トラブルシューティング**

```sh
sudo brew services restart dnsmasq
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

### 他デバイス (スマホ・別 PC)からも引かせる

dnsmasq を立てただけでは LAN 上の他デバイスは自動で解決してくれない。以下のいずれかが必要。

**ルータの DHCP で DNS サーバを Mac に差し替える (推奨)**

ルータの管理画面 → DHCP 設定で、配布する DNS サーバを以下のように設定:

| 項目 | 値 |
|---|---|
| プライマリ DNS | `<HOST_IP>`  (dnsmasq を動かしている Mac の LAN 内 IP) |
| セカンダリ DNS | `8.8.8.8` や `1.1.1.1` 等のパブリック DNS |

設定後、各デバイスを Wi-Fi 再接続 or DHCP lease 更新すれば `*.home.arpa` が解決できるようになる。

> **⚠ 注意**
>
> - **セカンダリ DNS は必ず設定**しておくこと。Mac が落ちたときに外向きの名前解決だけでも生きるようにするため (`*.home.arpa` 配下のサービスは Mac が落ちれば当然引けなくなる)
> - ノート PC だとスリープ / 持ち出しで dnsmasq が止まり、`*.home.arpa` 配下のサービスが一斉に見えなくなる。**常設のデスクトップ機**で運用するのが無難
> - Mac の LAN 内 IP は固定化しておくこと (ルータの DHCP 予約 or 静的 IP)
