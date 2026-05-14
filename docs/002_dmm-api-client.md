# 002 DMM API クライアント・型定義

## 概要
DMM API v3 への安全なサーバーサイドアクセス基盤を構築する。APIキーはサーバー専用。`NEXT_PUBLIC_` 厳禁。

## 依存
なし

## TODO

### 型定義
- [x] `types/dmm.ts` に DMM API レスポンスの Zod スキーマ・型を定義
  - [x] `DmmItem`（title / affiliateURL / imageURL / sampleMovieURL / prices / review / iteminfo）
  - [x] `DmmActress`（id / name / ruby / bust / waist / hip / height / birthday / imageURL）
  - [x] `DmmItemListResponse` / `DmmActressResponse`

### APIクライアント
- [x] `lib/dmm/client.ts` 作成
  - [x] `fetchItemList(params)` - 商品一覧取得（sort / keyword / article / hits / offset）
  - [x] `fetchActressList(params)` - 女優一覧取得
  - [x] `fetchFloorList()` - フロア一覧取得
  - [x] すべての関数でサーバー側のみ実行されることを `server-only` パッケージで保証
  - [x] レート制限対策: 連続リクエスト時に 500ms スリープ挟む実装（`fetchWithRateLimit`）

### Route Handler（API Proxy）
- [x] `app/api/dmm/items/route.ts` - クライアントからのフェッチ用プロキシ
- [x] `app/api/dmm/actresses/route.ts`
- [x] Route Handler 側で Zod バリデーション実施

### キャッシュ戦略
- [x] `fetch` に `next: { revalidate: 3600 }` を設定（商品データは1時間キャッシュ）
- [x] `React.cache()` で同一リクエスト内の重複フェッチを排除
- [x] `next.config.ts` に `optimizePackageImports: ['lucide-react']` を追加

## 備考
- `fetchFloorList` は `revalidate: 86400`（1日）で長めにキャッシュ
- `ActressListQuerySchema` / `ItemListQuerySchema` も `types/dmm.ts` に定義（Route Handler のバリデーション共用）
- Route Handler の `Cache-Control` ヘッダーで Cloudflare CDN にもキャッシュさせる

---

## API リファレンス（v3）

ベースURL: `https://api.dmm.com/affiliate/v3/`

全エンドポイント共通の必須パラメータ:

| パラメータ | 値の例 | 説明 |
|----------|-------|------|
| `api_id` | （環境変数 `DMM_API_ID` を使用） | API ID（1会員につき1ID） |
| `affiliate_id` | `yoshihirock-990` | 末尾 990〜999 のアフィリエイトID。それ以外はエラー |
| `output` | `json` | `json` または `xml`。常に `json` を指定する |

---

### 商品情報 API（ItemList）

`GET /ItemList`

#### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル / 初期値 | 概要 |
|--------|--------|:----:|---------------------|------|
| APIID | `api_id` | ○ | — | 登録時に割り振られたID |
| アフィリエイトID | `affiliate_id` | ○ | `yoshihirock-990` | 末尾 990〜999 のみ有効 |
| サイト | `site` | ○ | `FANZA` | `DMM.com`（一般）または `FANZA`（アダルト） |
| サービス | `service` | — | `digital` | フロアAPIから取得したサービスコード |
| フロア | `floor` | — | `videoa` | フロアAPIから取得したフロアコード |
| 取得件数 | `hits` | — | 初期値: 20 / 最大: **100** | 1リクエストで取得する件数 |
| 検索開始位置 | `offset` | — | 初期値: 1 / 最大: 50000 | ページネーション用 |
| ソート順 | `sort` | — | `rank` | `rank` / `price` / `-price` / `date` / `review` / `match` |
| キーワード | `keyword` | — | `松本いちか` | UTF-8で指定 |
| 商品ID | `cid` | — | `mizd00320` | `content_id` を直接指定 |
| 絞り込み項目 | `article` | — | `actress` | `actress` / `author` / `genre` / `series` / `maker` |
| 絞り込みID | `article_id` | — | `1011199` | 各検索APIから取得したID |
| 発売日以降 | `gte_date` | — | `2016-04-01T00:00:00` | ISO8601形式 |
| 発売日以前 | `lte_date` | — | `2016-04-30T23:59:59` | ISO8601形式 |
| 在庫絞り込み | `mono_stock` | — | `mono` | `stock` / `reserve` / `reserve_empty` / `mono` |
| コールバック | `callback` | — | `callback` | JSONP形式（使用しない） |

#### レスポンスフィールド

| フィールド | 説明 | 例 |
|----------|------|-----|
| `result.status` | ステータスコード | `200` |
| `result.result_count` | 取得件数 | `20` |
| `result.total_count` | 全体件数 | `50000` |
| `result.first_position` | 検索開始位置 | `1` |
| `items[].service_code` | サービスコード | `digital` |
| `items[].service_name` | サービス名 | `動画` |
| `items[].floor_code` | フロアコード | `videoa` |
| `items[].floor_name` | フロア名 | `ビデオ` |
| `items[].content_id` | 商品ID（URLや絞り込みに使用） | `mizd00320` |
| `items[].product_id` | 品番 | `mizd00320` |
| `items[].title` | タイトル | — |
| `items[].volume` | 収録時間またはページ数（分） | `350` |
| `items[].review.count` | レビュー数 | `8` |
| `items[].review.average` | レビュー平均点 | `3.13` |
| `items[].URL` | 商品ページURL | — |
| `items[].affiliateURL` | アフィリエイトリンクURL | — |
| `items[].imageURL.list` | リストページ用画像（小） | `https://pics.dmm.co.jp/...pt.jpg` |
| `items[].imageURL.small` | 小画像 | `https://pics.dmm.co.jp/...ps.jpg` |
| `items[].imageURL.large` | 大画像（高解像度） | `https://pics.dmm.co.jp/...pl.jpg` |
| `items[].sampleImageURL.sample_s` | サンプル画像（小）リスト | — |
| `items[].sampleImageURL.sample_l` | サンプル画像（大）リスト | — |
| `items[].sampleMovieURL` | サンプル動画URL（各サイズ） | — |
| `items[].prices.price` | 現在価格 | `100~` |
| `items[].prices.list_price` | 定価 | `300~` |
| `items[].prices.deliveries` | 配信リスト | — |
| `items[].date` | 発売日・配信開始日 | `2023-03-17 10:00:00` |
| `items[].iteminfo.genre` | ジャンル情報（id / name） | — |
| `items[].iteminfo.series` | シリーズ情報（id / name） | — |
| `items[].iteminfo.maker` | メーカー情報（id / name） | — |
| `items[].iteminfo.actress` | 女優情報（id / name） | — |
| `items[].iteminfo.director` | 監督情報（id / name） | — |
| `items[].iteminfo.label` | レーベル情報（id / name） | — |
| `items[].jancode` | JANコード | — |
| `items[].stock` | 在庫状況 | `reserve` |
| `items[].campaign` | キャンペーン情報 | — |

#### リクエスト例

```
https://api.dmm.com/affiliate/v3/ItemList
  ?api_id={DMM_API_ID}
  &affiliate_id=yoshihirock-990
  &site=FANZA
  &service=digital
  &floor=videoa
  &hits=100
  &sort=rank
  &output=json
```

---

### フロア API（FloorList）

`GET /FloorList`

service / floor コードはこのAPIで取得する。`revalidate: 86400`（1日キャッシュ）で十分。

#### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 概要 |
|--------|--------|:----:|------|
| APIID | `api_id` | ○ | API ID |
| アフィリエイトID | `affiliate_id` | ○ | 末尾 990〜999 のみ有効 |
| 出力形式 | `output` | — | `json` を指定 |

#### レスポンスフィールド（主要）

| フィールド | 説明 |
|----------|------|
| `result.site[].name` | サイト名（`DMM.com` / `FANZA`） |
| `result.site[].code` | サイトコード |
| `result.site[].service[].name` | サービス名（`動画`等） |
| `result.site[].service[].code` | サービスコード（`digital`等） |
| `result.site[].service[].floor[].id` | フロアID |
| `result.site[].service[].floor[].name` | フロア名（`ビデオ`等） |
| `result.site[].service[].floor[].code` | フロアコード（`videoa`等） |

---

### 女優検索 API（ActressSearch）

`GET /ActressSearch`

#### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
|--------|--------|:----:|------------|------|
| APIID | `api_id` | ○ | — | API ID |
| アフィリエイトID | `affiliate_id` | ○ | `yoshihirock-990` | 末尾 990〜999 のみ |
| 頭文字（50音） | `initial` | — | `あ` | UTF-8で指定 |
| 女優ID | `actress_id` | — | `15365` | 直接指定 |
| キーワード | `keyword` | — | `あさみ` | UTF-8で指定 |
| バスト | `gte_bust` / `lte_bust` | — | `90` | 以上/以下で絞り込み |
| ウエスト | `gte_waist` / `lte_waist` | — | `60` | 同上 |
| ヒップ | `gte_hip` / `lte_hip` | — | `90` | 同上 |
| 身長 | `gte_height` / `lte_height` | — | `160` | 同上 |
| 生年月日 | `gte_birthday` / `lte_birthday` | — | `1990-01-01` | `yyyy-mm-dd`形式 |
| 取得件数 | `hits` | — | 初期値: 20 / 最大: 100 | — |
| 検索開始位置 | `offset` | — | 初期値: 1 | — |
| ソート順 | `sort` | — | `-name` | `name` / `-name` / `bust` / `-bust` / `waist` / `-waist` / `hip` / `-hip` / `height` / `-height` / `birthday` / `-birthday` / `id` / `-id` |

#### レスポンスフィールド（主要）

| フィールド | 説明 | 例 |
|----------|------|-----|
| `result.result_count` | 取得件数 | `20` |
| `result.total_count` | 全体件数 | `64964` |
| `actress[].id` | 女優ID | `15365` |
| `actress[].name` | 女優名 | `麻美ゆま` |
| `actress[].ruby` | 読み仮名 | `あさみゆま` |
| `actress[].bust` | バスト | `96` |
| `actress[].cup` | カップ数 | `H` |
| `actress[].waist` | ウェスト | `58` |
| `actress[].hip` | ヒップ | `88` |
| `actress[].height` | 身長 | `158` |
| `actress[].birthday` | 生年月日 | `1987-03-24` |
| `actress[].blood_type` | 血液型 | `AB` |
| `actress[].hobby` | 趣味 | — |
| `actress[].prefectures` | 出身地 | `東京都` |
| `actress[].imageURL.small` | 画像（小） | — |
| `actress[].imageURL.large` | 画像（大） | — |
| `actress[].listURL.digital` | 動画リストURL | — |
| `actress[].listURL.monthly` | 月額動画リストURL | — |
| `actress[].listURL.mono` | DVD通販リストURL | — |

---

### ジャンル検索 API（GenreSearch）

`GET /GenreSearch`

**`floor_id` が必須**。フロアAPIで取得したIDを使用する。

#### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
|--------|--------|:----:|------------|------|
| APIID | `api_id` | ○ | — | API ID |
| アフィリエイトID | `affiliate_id` | ○ | `yoshihirock-990` | — |
| フロアID | `floor_id` | ○ | `25` | フロアAPIから取得 |
| 頭文字（50音） | `initial` | — | `き` | UTF-8で指定 |
| 取得件数 | `hits` | — | 初期値: 100 / 最大: 500 | — |
| 検索開始位置 | `offset` | — | 初期値: 1 | — |

#### レスポンスフィールド（主要）

| フィールド | 説明 |
|----------|------|
| `result.floor_id` | フロアID |
| `result.floor_name` | フロア名 |
| `result.floor_code` | フロアコード |
| `genre[].genre_id` | ジャンルID（`article_id` に使用） |
| `genre[].name` | ジャンル名 |
| `genre[].ruby` | 読み仮名 |
| `genre[].list_url` | リストページURL |

---

### メーカー検索 API（MakerSearch）

`GET /MakerSearch`

**`floor_id` が必須**。

#### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
|--------|--------|:----:|------------|------|
| APIID | `api_id` | ○ | — | API ID |
| アフィリエイトID | `affiliate_id` | ○ | `yoshihirock-990` | — |
| フロアID | `floor_id` | ○ | `43` | フロアAPIから取得 |
| 頭文字（50音） | `initial` | — | `あ` | UTF-8で指定 |
| 取得件数 | `hits` | — | 初期値: 100 / 最大: 500 | — |
| 検索開始位置 | `offset` | — | 初期値: 1 | — |

#### レスポンスフィールド（主要）

| フィールド | 説明 |
|----------|------|
| `maker[].maker_id` | メーカーID（`article_id` に使用） |
| `maker[].name` | メーカー名 |
| `maker[].ruby` | 読み仮名 |
| `maker[].list_url` | リストページURL |

---

### シリーズ検索 API（SeriesSearch）

`GET /SeriesSearch`

**`floor_id` が必須**。

#### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
|--------|--------|:----:|------------|------|
| APIID | `api_id` | ○ | — | API ID |
| アフィリエイトID | `affiliate_id` | ○ | `yoshihirock-990` | — |
| フロアID | `floor_id` | ○ | `27` | フロアAPIから取得 |
| 頭文字（50音） | `initial` | — | `お` | UTF-8で指定 |
| 取得件数 | `hits` | — | 初期値: 100 / 最大: 500 | — |
| 検索開始位置 | `offset` | — | 初期値: 1 | — |

#### レスポンスフィールド（主要）

| フィールド | 説明 |
|----------|------|
| `series[].series_id` | シリーズID（`article_id` に使用） |
| `series[].name` | シリーズ名 |
| `series[].ruby` | 読み仮名 |
| `series[].list_url` | リストページURL |

---

### 作者検索 API（AuthorSearch）

`GET /AuthorSearch`

**`floor_id` が必須**。主に同人・書籍フロアで使用する。

#### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
|--------|--------|:----:|------------|------|
| APIID | `api_id` | ○ | — | API ID |
| アフィリエイトID | `affiliate_id` | ○ | `yoshihirock-990` | — |
| フロアID | `floor_id` | ○ | `27` | フロアAPIから取得 |
| 読み仮名 | `initial` | — | `う゛ぃくとる` | 作者名読み仮名をUTF-8で指定（前方一致） |
| 取得件数 | `hits` | — | 初期値: 100 / 最大: 500 | — |
| 検索開始位置 | `offset` | — | 初期値: 1 | — |

#### レスポンスフィールド（主要）

| フィールド | 説明 |
|----------|------|
| `author[].author_id` | 作者ID（`article_id` に使用） |
| `author[].name` | 作者名 |
| `author[].ruby` | 読み仮名 |
| `author[].another_name` | 作者別名 |
| `author[].list_url` | リストページURL |
