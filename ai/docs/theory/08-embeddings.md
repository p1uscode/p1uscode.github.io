# 埋め込みと近傍検索

[第 6 章 記憶の多層モデル](06-memory.md) の L4 (外部ストレージによる長期記憶) と、次章で扱う **RAG (Retrieval-Augmented Generation)** の両方に共通する基盤技術が「埋め込み (embedding)」と「近傍検索 (nearest neighbor search)」。この章ではその仕組みを最短距離で説明する。

## 文字列は直接比較できない

「富士山の高さ」と「Mt. Fuji の標高」は人間には同じ意味だが、文字列としては 1 文字も一致しない。正規表現や全文検索 (tf-idf, BM25) でも部分的にしか拾えない。

**「意味が近いかどうか」を数値で測りたい**というのが埋め込み登場の動機。

## 埋め込み = テキスト → ベクトル

埋め込みモデルは、任意の文字列を**高次元ベクトル** (数百〜数千次元の浮動小数点数列) に変換する関数:

```
"富士山の高さ"     → [0.021, -0.148, 0.573, ..., 0.082]   (例: 1536 次元)
"Mt. Fuji の標高"  → [0.018, -0.141, 0.569, ..., 0.091]   (似たベクトル)
"今日の天気"       → [0.821, 0.034, -0.445, ..., -0.210]  (全然違うベクトル)
```

**ポイント**:

- 出力ベクトルの 1 次元 1 次元に人間が解釈できる意味はない (学習時に決まった「意味の空間」の座標)
- 意味的に近い文字列は**空間上で近い点**に落ちる
- どれだけ近いかは 2 ベクトルの距離で測る

代表的な埋め込みモデル:

| モデル | 次元数 | 特徴 |
|---|---|---|
| `text-embedding-3-small` (OpenAI) | 1536 | 軽量・安価 |
| `text-embedding-3-large` (OpenAI) | 3072 | 高精度 |
| `gemini-embedding-001` (Google) | 3072 | 多言語強め |
| `voyage-3` / `voyage-large-2` (Voyage AI) | 1024 / 1536 | 検索特化 |
| `bge-m3` / `bge-large-en-v1.5` (BAAI) | 1024 / 1024 | OSS、日本語もまあまあ |
| `multilingual-e5-large` | 1024 | 多言語 OSS |

埋め込みは**推論コストが LLM より 1〜2 桁安い**。文字列 1 本あたり数 ms 程度で、ベクトルを 1 回作れば後は DB に保存して使い回せる。

## ベクトル間の距離の測り方

2 ベクトルがどれだけ「近い」かを計算する関数。埋め込み検索では主に 3 種類:

### (1) コサイン類似度 (cosine similarity)

```
cos(a, b) = (a · b) / (|a| × |b|)
```

- ベクトルの**向き**だけを見る (長さは無視)
- -1 〜 1 の範囲。1 に近いほど「意味が同じ方向」
- 大半の埋め込みモデルはこれを前提に学習されている

### (2) 内積 (dot product)

```
dot(a, b) = Σ aᵢ × bᵢ
```

- ベクトルの向き + 長さの両方が効く
- ベクトルを「単位ベクトル化 (正規化)」していれば cosine と同等
- 計算が軽い (割り算がない) ので大規模検索で好まれる

### (3) ユークリッド距離 (L2)

```
dist(a, b) = √(Σ (aᵢ - bᵢ)²)
```

- 2 点間の直線距離
- 小さいほど「近い」(他と逆)
- 埋め込み検索ではあまり使わない (cosine / dot の方が意味的類似性を捉えやすい)

**どれを使うかは埋め込みモデル次第**。モデルのドキュメントに「cosine / normalized dot product を使え」と書いてあるのでそれに従う。

## 近傍検索 (Nearest Neighbor Search)

クエリの埋め込みベクトル 1 本に対して、**DB に保存されている N 本のベクトルの中から「最も近い上位 K 件」を見つける**処理。単純にやるなら:

```
for each vec in DB:
    score = cosine(query_vec, vec)
top_k = sort(DB, by score desc)[:K]
```

これが**線形全探索**。DB サイズが数千〜数万なら十分速いが、数百万を超えると遅すぎる。本番では**近似近傍検索 (Approximate Nearest Neighbor, ANN)** を使う。

### 近似近傍検索の代表アルゴリズム

| 名前 | 仕組みの雰囲気 | 特徴 |
|---|---|---|
| **HNSW** (Hierarchical Navigable Small World) | グラフを階層構造で構築、近い点を辿る | 速い・精度高い・メモリを食う。Qdrant / Weaviate / pgvector のデフォルト |
| **IVF** (Inverted File) | ベクトルをクラスタに分割、該当クラスタだけ検索 | メモリ効率が良い。FAISS の定番 |
| **PQ** (Product Quantization) | ベクトルを量子化して圧縮 | メモリを大幅節約、精度は落ちる |
| **DiskANN** | ディスクベース HNSW の派生 | メモリ不足でも大規模検索ができる |

「近似」と言っても recall@10 で 95%+ 出るので、実用上はほぼ exact 検索と変わらない。計算量は線形 O(N) から O(log N) 近くまで落ちる。

## ベクトル DB

ベクトルの保存 + 近傍検索を専門に扱うデータベース。本リポジトリでは [Qdrant](../setup/services.md) が立っている。主要プレイヤー:

| DB | 特徴 | この repo で使う? |
|---|---|---|
| **Qdrant** | OSS、Rust 製、HNSW、フィルタ機能強い | ✅ (単体起動、学習用) |
| **Weaviate** | OSS、モジュール方式、GraphQL | — |
| **Chroma** | 組み込み / Python 簡易用 | — |
| **pgvector** | Postgres 拡張、SQL で扱える | (Dify 内部が使う) |
| **Milvus** | 大規模・分散 | — |
| **pinecone** | SaaS、運用楽 | — |
| **Elasticsearch (vector search)** | 全文検索と統合 | — |

どれも基本操作は同じ:

1. **collection (index) を作る**: 次元数と距離関数を指定
2. **ベクトルを upsert する**: id + vector + payload (元テキストや metadata)
3. **検索する**: query vector + top_k + filter で結果を得る

### Qdrant での最小例

本リポジトリの Qdrant に直接 curl で触れる:

```sh
# コレクション作成 (1536 次元、cosine)
curl -X PUT http://qdrant.home.arpa/collections/demo \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 1536, "distance": "Cosine"}}'

# ベクトル upsert (実際には埋め込みモデルで生成したものを使う)
curl -X PUT http://qdrant.home.arpa/collections/demo/points \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {"id": 1, "vector": [0.1, 0.2, ...], "payload": {"text": "富士山の高さは 3776m"}},
      {"id": 2, "vector": [0.3, 0.1, ...], "payload": {"text": "エベレストは 8848m"}}
    ]
  }'

# 検索
curl -X POST http://qdrant.home.arpa/collections/demo/points/search \
  -H "Content-Type: application/json" \
  -d '{"vector": [0.12, 0.18, ...], "limit": 3}'
```

## 埋め込みの「限界」

便利だが万能ではない。誤解しやすいポイント:

### (1) 「意味的類似」は学習データ依存

埋め込みモデルが「この 2 つは似ている」と判断する基準は、**学習時に使ったコーパスで一緒に現れたかどうか**に寄っている。専門分野の術語 / 社内用語 / 最新のトピックは汎用モデルでは拾えないことがある。

→ 対策: 特定ドメイン用に **fine-tuned 埋め込みモデル**を使う、または BM25 (キーワード検索) と併用する (ハイブリッド検索)。

### (2) 「ベクトルが近い = 答えが近い」は限らない

埋め込みは**類似性** (similarity) を測るもので、**関連性** (relevance) や **正しさ** (correctness) を保証しない。質問と回答が似ていても、その回答が質問の答えになっているとは限らない。

→ 対策: 次章 RAG で扱う re-ranker (BGE-reranker, Cohere rerank 等) で「似ている候補」を「関連している順」に並べ直す。

### (3) 長文は弱い

埋め込みは通常 512〜8192 トークン程度の制約があり、それを超える文書は**チャンク分割**が必要。チャンクの切り方 (大きさ / オーバーラップ / 意味境界) が検索品質を大きく左右する。

→ 対策: 次章 RAG で扱う。

### (4) 異モデル間のベクトルは比較できない

`text-embedding-3-small` で作ったベクトルと、`bge-large` で作ったベクトルは**別々の空間に住んでいる**ので、比較しても意味がない。モデルを切り替えたら**全文書を再 embedding** する必要がある。

→ 対策: 移行計画を立てる / 新旧を並行運用する期間を設ける。

## agent-demo での位置付け

現状 agent-demo には埋め込みも Qdrant 検索ツールも入っていない。拡張するとしたら:

```typescript
// tools.ts に追加 (擬似)
export const semanticSearchTool = tool(
  async ({ query }: { query: string }) => {
    const embedding = await embedText(query);                 // 埋め込み生成
    const results = await qdrant.search("my_docs", {          // 近傍検索
      vector: embedding,
      limit: 5,
    });
    return JSON.stringify(results.map(r => r.payload.text));
  },
  {
    name: "semantic_search",
    description: "Search internal knowledge base by semantic similarity. Use for company-specific or domain knowledge.",
    schema: z.object({ query: z.string() }),
  },
);
```

これを加えると**エージェントは「自分の知らないことを調べる長期記憶」を手に入れる**。次章で具体的に RAG として統合する。

## まとめ

- **埋め込み** = テキストを高次元ベクトルに変換する関数。意味が近いほど空間上で近い点になる
- **距離関数** は cosine (向き) / dot product (向き+長さ) / L2 (直線距離) の 3 種、モデル指定に従う
- **近傍検索** は「クエリ埋め込みに近い上位 K 件」を探す処理。大規模では近似アルゴリズム (HNSW 等) を使う
- **ベクトル DB** は upsert + 検索を効率化する専門 DB。本リポジトリでは Qdrant が立っている
- **限界**: 学習データ依存 / 類似 ≠ 関連 / 長文は弱い / モデル切替で再埋め込みが必要
- 次章 RAG は「埋め込みで過去知識を取り出し → LLM の context に注入する」パターン
