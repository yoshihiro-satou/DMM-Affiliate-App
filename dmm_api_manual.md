# DMM Web サービス API マニュアル

## アフィリエイトサイト一覧

| サイト名 | サイトURL | アフィリエイトID | ステータス |
| :---- | :---- | :---- | :---- |
| 巨乳辱め.com | [https://hazukashime.com/](https://hazukashime.com/) | yoshihirock-002 | 承認済み |
| ★よっし～★FANZAお得情報配信中 | [https://twitter.com/yoshihirock0710](https://twitter.com/yoshihirock0710) | yoshihirock-004 | 承認済み |
| 商品情報API用登録-001 | \- | yoshihirock-990 | 承認済み |
| 商品情報API用登録-002 | \- | yoshihirock-991 | 承認済み |
| 商品情報API用登録-003 | \- | yoshihirock-992 | 承認済み |
| 商品情報API用登録-004 | \- | yoshihirock-993 | 承認済み |
| 商品情報API用登録-005 | \- | yoshihirock-994 | 承認済み |
| 商品情報API用登録-006 | \- | yoshihirock-995 | 承認済み |
| 商品情報API用登録-007 | \- | yoshihirock-996 | 承認済み |
| 商品情報API用登録-008 | \- | yoshihirock-997 | 承認済み |

---

## DMM Web サービスについて

DMM Web サービスはDMMが保有するデータベースを外部から利用するためのWeb APIを提供するサービスです。

### ご利用について

Web サービスをご利用するには、DMM会員登録、DMMアフィリエイト登録、API利用登録が必要となります。  
[利用規約](https://terms.dmm.com/affiliate_web_service/) をご確認のうえ、API IDの発行を行ってください。  
ご利用の手順については「[ご利用ガイド](https://affiliate.dmm.com/api/guide/)」にてご確認ください。

### Web サービスの利用にあたって

Web サービスを利用しているサイトやアプリケーションにはクレジット表示が必要となります。  
詳しくは「[クレジット表示](https://affiliate.dmm.com/api/credit.html)」にてご確認ください。

---

## 提供中 API

| API名 | 概要 |
| :---- | :---- |
| 商品情報API version3.0 | DMM.com の商品の情報を取得することが可能なAPI |
| 女優検索API | 女優情報を取得することが可能なAPI |
| ジャンル検索API | ジャンル一覧を取得することが可能なAPI |
| メーカー検索API | メーカー一覧を取得することが可能なAPI |
| シリーズ検索API | シリーズ一覧を取得することが可能なAPI |
| 作者検索API | 作者一覧を取得することが可能なAPI |
| フロア検索API | フロア一覧を取得することが可能なAPI |

- **APIの提供形式**: REST  
- **APIのレスポンス形式**: XML、JSON

version3.0 を公開しました。

---

## API ID

**重要**: リクエスト時に使用するアフィリエイトIDは末尾990～999以外リクエストできない制限になっております。リクエスト時にエラーが返る方はご確認をお願いいたします。

API ID はDMM Webサービス利用者を特定するIDで、各リクエスト送信時に必要となります。  
API IDは1会員につき 1IDが発行されます。

**佐藤善裕さんのAPI ID**

uaVT3DGhgNk5XmNLZ9PG

APIID登録にともないアフィリエイトIDの末尾990～999が発行されました。  
**リクエスト時のアフィリエイトIDは末尾を990～999に設定してください。末尾が990～999以外ではエラーとなります。**

---

## ご利用手順

### 1\. APIリファレンスの確認

提供しているAPIのリファレンス（参考資料）を用意していますので、アプリケーション作成の際に、ご利用ください。

- [ご利用手順](https://affiliate.dmm.com/api/guide/)  
- [リクエストURLについて](https://affiliate.dmm.com/api/guide/)  
- [各APIについて](https://affiliate.dmm.com/api/guide/)

### 2\. アプリケーションを開発

DMMが提供するAPIを利用してアプリケーションを開発、作成できます。

### 3\. 作成したアプリケーションを公開

DMM Web サービスから提供されたAPIを利用して制作されたサイトやアプリケーションを公開する際には、クレジット表示が必要になります。詳しくは「クレジット表示」のページにてご確認ください。

---

## リクエストURLについて

### リクエストURLの基本形式

「APIのURI」に続けて「`?`」。項目名とエスケープ後の値を「`=`」で連結し、各項目間を「`&`」で連結。URLエスケープした上でGETで送信する。リクエストの文字エンコードは「UTF-8」。

### リクエストURL例（商品検索APIの場合）

https://api.dmm.com/affiliate/v3/ItemList?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&site=FANZA\&service=digital\&floor=videoa\&hits=10\&sort=date\&keyword=%e4%b8%8a%e5%8e%9f%e4%ba%9c%e8%a1%a3\&output=json

**アフィリエイトIDは末尾を990～999に設定してください。末尾が990～999以外ではエラーとなります。**  
**一度のリクエストで取得できるのは100件までとなります。**

---

## 各 API について

| API | 概要 |
| :---- | :---- |
| [商品情報API](https://affiliate.dmm.com/api/v3/itemlist.html) | DMMの全商品を取得するAPI（※アフィリエイト対象の商品） |
| [フロアAPI](https://affiliate.dmm.com/api/v3/floorlist.html) | DMMのフロア一覧を取得するAPI |
| [女優検索API](https://affiliate.dmm.com/api/v3/actresssearch.html) | 女優名、３サイズ、頭文字などで女優情報を取得するAPI |
| [ジャンル検索API](https://affiliate.dmm.com/api/v3/genresearch.html) | 特定のフロアのジャンル一覧や頭文字に該当するジャンルを取得するAPI |
| [メーカー検索API](https://affiliate.dmm.com/api/v3/makersearch.html) | 特定のフロアのメーカー一覧や頭文字に該当するメーカーを取得するAPI |
| [シリーズ検索API](https://affiliate.dmm.com/api/v3/seriessearch.html) | 特定のフロアのシリーズ一覧や頭文字に該当するシリーズを取得するAPI |
| [作者検索API](https://affiliate.dmm.com/api/v3/authorsearch.html) | 特定のフロアの作者一覧や頭文字に該当する作者を取得するAPI |

---

## 商品情報 API

DMM.com、FANZAの商品の情報を取得することが可能なAPIです。

### リクエストURL

https://api.dmm.com/affiliate/v3/ItemList?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&site=FANZA\&service=digital\&floor=videoa\&hits=10\&sort=date\&keyword=%e4%b8%8a%e5%8e%9f%e4%ba%9c%e8%a1%a3\&output=json

※ APIID・アフィリエイトIDを入力する際には、前後の `[ ]` は不要です。

### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
| :---- | :---- | :---- | :---- | :---- |
| APIID | api\_id | ○ |  | 登録時に割り振られたID |
| アフィリエイトID | affiliate\_id | ○ | affiliate-990 | 登録時に割り振られた990～999までのアフィリエイトID |
| サイト | site | ○ | FANZA | 一般（DMM.com）かアダルト（FANZA）か |
| サービス | service |  | digital | フロアAPIから取得できるサービスコードを指定 |
| フロア | floor |  | videoa | フロアAPIから取得できるフロアコードを指定 |
| 取得件数 | hits |  | 20 | 初期値：20　最大：100 |
| 検索開始位置 | offset |  | 1 | 初期値：1　最大：50000 |
| ソート順 | sort |  | rank | 初期値：rank / 人気：rank / 価格高順：price / 価格安順：-price / 発売日：date / 評価：review / マッチング順：match |
| キーワード | keyword |  | 松本いちか | UTF-8で指定 |
| 商品ID | cid |  | mizd00320 | 商品に振られているcontent\_id |
| 絞り込み項目 | article |  | actress | actress / author / genre / series / maker |
| 絞り込みID | article\_id |  | 1011199 | 各検索APIから取得可能なID |
| 発売日絞り込み（以降） | gte\_date |  | 2016-04-01T00:00:00 | ISO8601形式 |
| 発売日絞り込み（以前） | lte\_date |  | 2016-04-30T23:59:59 | ISO8601形式 |
| 在庫絞り込み | mono\_stock |  | mono | stock / reserve / reserve\_empty / mono |
| 出力形式 | output |  | json | json / xml |
| コールバック | callback |  | callback | JSONP形式出力用 |

### レスポンスフィールド

| フィールド | 説明 | 例 |
| :---- | :---- | :---- |
| result.status | ステータスコード | 200 |
| result.result\_count | 取得件数 | 20 |
| result.total\_count | 全体件数 | 50000 |
| result.first\_position | 検索開始位置 | 1 |
| items\[\].service\_code | サービスコード | digital |
| items\[\].service\_name | サービス名 | 動画 |
| items\[\].floor\_code | フロアコード | videoa |
| items\[\].floor\_name | フロア名 | ビデオ |
| items\[\].content\_id | 商品ID | 15dss00145 |
| items\[\].product\_id | 品番 | 15dss00145dl |
| items\[\].title | タイトル |  |
| items\[\].volume | 収録時間またはページ数 | 350 |
| items\[\].review.count | レビュー数 | 8 |
| items\[\].review.average | レビュー平均点 | 3.13 |
| items\[\].URL | 商品ページURL |  |
| items\[\].affiliateURL | アフィリエイトリンクURL |  |
| items\[\].imageURL.list | リストページ用画像 |  |
| items\[\].imageURL.small | 小画像 |  |
| items\[\].imageURL.large | 大画像 |  |
| items\[\].sampleImageURL.sample\_s | サンプル画像（小）リスト |  |
| items\[\].sampleImageURL.sample\_l | サンプル画像（大）リスト |  |
| items\[\].sampleMovieURL | サンプル動画URL（各サイズ） |  |
| items\[\].prices.price | 価格 | 300～ |
| items\[\].prices.list\_price | 定価 |  |
| items\[\].prices.deliveries | 配信リスト |  |
| items\[\].date | 発売日・配信開始日 | 2012/8/3 10:00 |
| items\[\].iteminfo.genre | ジャンル情報 |  |
| items\[\].iteminfo.series | シリーズ情報 |  |
| items\[\].iteminfo.maker | メーカー情報 |  |
| items\[\].iteminfo.actress | 女優情報 |  |
| items\[\].iteminfo.director | 監督情報 |  |
| items\[\].iteminfo.label | レーベル情報 |  |
| items\[\].jancode | JANコード |  |
| items\[\].stock | 在庫状況 | reserve |
| items\[\].campaign | キャンペーン情報 |  |

### サンプルレスポンス

{

  "request": {

    "parameters": {

      "api\_id": "example",

      "affiliate\_id": "affiliate-990",

      "site": "FANZA",

      "service": "digital",

      "floor": "videoa",

      "keyword": "松本いちか"

    }

  },

  "result": {

    "status": 200,

    "result\_count": 5,

    "total\_count": 1450,

    "first\_position": 1,

    "items": \[

      {

        "service\_code": "digital",

        "service\_name": "動画",

        "floor\_code": "videoa",

        "floor\_name": "ビデオ",

        "content\_id": "mizd00320",

        "product\_id": "mizd00320",

        "title": "令和イチのメスガキ 松本いちか わからせ痴女られ10作品8時間ベスト",

        "volume": "476",

        "review": {

          "count": 13,

          "average": "5.00"

        },

        "URL": "https://video.dmm.co.jp/av/content/?id=mizd00320",

        "affiliateURL": "https://al.fanza.co.jp/?lurl=...\&af\_id=affiliate-990\&ch=api",

        "imageURL": {

          "list": "https://pics.dmm.co.jp/digital/video/mizd00320/mizd00320pt.jpg",

          "small": "https://pics.dmm.co.jp/digital/video/mizd00320/mizd00320ps.jpg",

          "large": "https://pics.dmm.co.jp/digital/video/mizd00320/mizd00320pl.jpg"

        },

        "prices": {

          "price": "100\~",

          "list\_price": "300\~"

        },

        "date": "2023-03-17 10:00:00"

      }

    \]

  }

}

---

## フロア API

フロア一覧を取得することが可能なAPIです。

### リクエストURL

https://api.dmm.com/affiliate/v3/FloorList?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&output=json\&callback=example

### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
| :---- | :---- | :---- | :---- | :---- |
| APIID | api\_id | ○ |  | 登録時に割り振られたID |
| アフィリエイトID | affiliate\_id | ○ | affiliate-990 | 登録時に割り振られた990～999までのアフィリエイトID |
| 出力形式 | output |  | json | json / xml |
| コールバック | callback |  | callback | JSONP形式出力用 |

### レスポンスフィールド

| フィールド | 説明 | 例 |
| :---- | :---- | :---- |
| result.site.name | サイト名 | DMM.com（一般） |
| result.site.code | サイトコード | DMM.com |
| result.site.service.name | サービス名 | 動画 |
| result.site.service.code | サービスコード | digital |
| result.site.service.floor.id | フロアID | 6 |
| result.site.service.floor.name | フロア名 | 映画・ドラマ |
| result.site.service.floor.code | フロアコード | cinema |

---

## 女優検索 API

女優情報を取得することが可能なAPIです。

### リクエストURL

https://api.dmm.com/affiliate/v3/ActressSearch?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&keyword=%e3%81%82%e3%81%95%e3%81%bf\&gte\_bust=90\&lte\_waist=60\&sort=-bust\&hits=10\&offset=10\&output=json

### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
| :---- | :---- | :---- | :---- | :---- |
| APIID | api\_id | ○ |  | 登録時に割り振られたID |
| アフィリエイトID | affiliate\_id | ○ | affiliate-990 | 登録時に割り振られた990～999までのアフィリエイトID |
| 頭文字(50音) | initial |  | あ | 50音をUTF-8で指定 |
| 女優ID | actress\_id |  | 15365 | 女優ID |
| キーワード | keyword |  | あさみ | UTF-8で指定 |
| バスト | gte\_bust / lte\_bust |  | 90 | 以上/以下での絞り込み |
| ウエスト | gte\_waist / lte\_waist |  | 60 | 同上 |
| ヒップ | gte\_hip / lte\_hip |  | 90 | 同上 |
| 身長 | gte\_height / lte\_height |  | 160 | 同上 |
| 生年月日 | gte\_birthday / lte\_birthday |  | 1990-01-01 | yyyy-mm-dd形式 |
| 取得件数 | hits |  | 20 | 初期値：20　最大：100 |
| 検索開始位置 | offset |  | 1 | 初期値：1 |
| ソート順 | sort |  | \-name | name / \-name / bust / \-bust / waist / \-waist / hip / \-hip / height / \-height / birthday / \-birthday / id / \-id |
| 出力形式 | output |  | json | json / xml |
| コールバック | callback |  | callback | JSONP形式出力用 |

### レスポンスフィールド

| フィールド | 説明 | 例 |
| :---- | :---- | :---- |
| result.status | ステータスコード | 200 |
| result.result\_count | 取得件数 | 20 |
| result.total\_count | 全体件数 | 64964 |
| result.first\_position | 検索開始位置 | 1 |
| actress\[\].id | 女優ID | 15365 |
| actress\[\].name | 女優名 | 麻美ゆま |
| actress\[\].ruby | 読み仮名 | あさみゆま |
| actress\[\].bust | バスト | 96 |
| actress\[\].cup | カップ数 | H |
| actress\[\].waist | ウェスト | 58 |
| actress\[\].hip | ヒップ | 88 |
| actress\[\].height | 身長 | 158 |
| actress\[\].birthday | 生年月日 | 1987-03-24 |
| actress\[\].blood\_type | 血液型 | AB |
| actress\[\].hobby | 趣味 |  |
| actress\[\].prefectures | 出身地 | 東京都 |
| actress\[\].imageURL.small | 画像（小） |  |
| actress\[\].imageURL.large | 画像（大） |  |
| actress\[\].listURL.digital | 動画リストURL |  |
| actress\[\].listURL.monthly | 月額動画リストURL |  |
| actress\[\].listURL.mono | DVD通販リストURL |  |

---

## ジャンル検索 API

ジャンル一覧を取得することが可能なAPIです。

### リクエストURL

https://api.dmm.com/affiliate/v3/GenreSearch?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&initial=%e3%81%8d\&floor\_id=25\&hits=10\&offset=10\&output=json

### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
| :---- | :---- | :---- | :---- | :---- |
| APIID | api\_id | ○ |  | 登録時に割り振られたID |
| アフィリエイトID | affiliate\_id | ○ | affiliate-990 | 登録時に割り振られた990～999までのアフィリエイトID |
| フロアID | floor\_id | ○ |  | フロア検索APIから取得可能なフロアID |
| 頭文字(50音) | initial |  | あ | 50音をUTF-8で指定 |
| 取得件数 | hits |  | 100 | 初期値：100　最大：500 |
| 検索開始位置 | offset |  | 1 | 初期値：1 |
| 出力形式 | output |  | json | json / xml |
| コールバック | callback |  | callback | JSONP形式出力用 |

### レスポンスフィールド

| フィールド | 説明 | 例 |
| :---- | :---- | :---- |
| result.status | ステータスコード | 200 |
| result.floor\_id | フロアID | 40 |
| result.floor\_name | フロア名 | ビデオ |
| result.floor\_code | フロアコード | videoa |
| genre\[\].genre\_id | ジャンルID | 2001 |
| genre\[\].name | ジャンル名 | 巨乳 |
| genre\[\].ruby | 読み仮名 | きょにゅう |
| genre\[\].list\_url | リストページURL |  |

---

## メーカー検索 API

メーカー一覧を取得することが可能なAPIです。

### リクエストURL

https://api.dmm.com/affiliate/v3/MakerSearch?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&floor\_id=43\&hits=10\&offset=100\&output=json

### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
| :---- | :---- | :---- | :---- | :---- |
| APIID | api\_id | ○ |  | 登録時に割り振られたID |
| アフィリエイトID | affiliate\_id | ○ | affiliate-990 | 登録時に割り振られた990～999までのアフィリエイトID |
| フロアID | floor\_id | ○ |  | フロア検索APIから取得可能なフロアID |
| 頭文字(50音) | initial |  | あ | 50音をUTF-8で指定 |
| 取得件数 | hits |  | 100 | 初期値：100　最大：500 |
| 検索開始位置 | offset |  | 1 | 初期値：1 |
| 出力形式 | output |  | json | json / xml |
| コールバック | callback |  | callback | JSONP形式出力用 |

### レスポンスフィールド

| フィールド | 説明 | 例 |
| :---- | :---- | :---- |
| result.status | ステータスコード | 200 |
| result.floor\_id | フロアID | 40 |
| result.floor\_name | フロア名 | ビデオ |
| maker\[\].maker\_id | メーカーID | 1509 |
| maker\[\].name | メーカー名 | ムーディーズ |
| maker\[\].ruby | 読み仮名 | むーでぃーず |
| maker\[\].list\_url | リストページURL |  |

---

## シリーズ検索 API

シリーズ一覧を取得することが可能なAPIです。

### リクエストURL

https://api.dmm.com/affiliate/v3/SeriesSearch?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&initial=%e3%81%8a\&floor\_id=27\&hits=10\&output=json

### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
| :---- | :---- | :---- | :---- | :---- |
| APIID | api\_id | ○ |  | 登録時に割り振られたID |
| アフィリエイトID | affiliate\_id | ○ | affiliate-990 | 登録時に割り振られた990～999までのアフィリエイトID |
| フロアID | floor\_id | ○ |  | フロア検索APIから取得可能なフロアID |
| 頭文字(50音) | initial |  | あ | 50音をUTF-8で指定 |
| 取得件数 | hits |  | 100 | 初期値：100　最大：500 |
| 検索開始位置 | offset |  | 1 | 初期値：1 |
| 出力形式 | output |  | json | json / xml |
| コールバック | callback |  | callback | JSONP形式出力用 |

### レスポンスフィールド

| フィールド | 説明 | 例 |
| :---- | :---- | :---- |
| result.status | ステータスコード | 200 |
| result.floor\_id | フロアID | 24 |
| result.floor\_name | フロア名 | 本・コミック |
| series\[\].series\_id | シリーズID | 62226 |
| series\[\].name | シリーズ名 | ARIA |
| series\[\].ruby | 読み仮名 | ありあ |
| series\[\].list\_url | リストページURL |  |

---

## 作者検索 API

作者一覧を取得することが可能なAPIです。

### リクエストURL

https://api.dmm.com/affiliate/v3/AuthorSearch?api\_id=\[APIID\]\&affiliate\_id=\[アフィリエイトID\]\&initial=%e3%81%86\&floor\_id=27\&hits=10\&output=json

### リクエストパラメータ

| 論理名 | 物理名 | 必須 | 値のサンプル | 概要 |
| :---- | :---- | :---- | :---- | :---- |
| APIID | api\_id | ○ |  | 登録時に割り振られたID |
| アフィリエイトID | affiliate\_id | ○ | affiliate-990 | 登録時に割り振られた990～999までのアフィリエイトID |
| フロアID | floor\_id | ○ |  | フロア検索APIから取得可能なフロアID |
| 読み仮名 | initial |  | う゛ぃくとる | 作者名（読み仮名）をUTF-8で指定、前方一致検索 |
| 取得件数 | hits |  | 100 | 初期値：100　最大：500 |
| 検索開始位置 | offset |  | 1 | 初期値：1 |
| 出力形式 | output |  | json | json / xml |
| コールバック | callback |  | callback | JSONP形式出力用 |

### レスポンスフィールド

| フィールド | 説明 | 例 |
| :---- | :---- | :---- |
| result.status | ステータスコード | 200 |
| result.floor\_id | フロアID | 24 |
| result.floor\_name | フロア名 | 本・コミック |
| author\[\].author\_id | 作者ID | 21414 |
| author\[\].name | 作者名 | ヴィクトル・ユゴー |
| author\[\].ruby | 読み仮名 | う゛ぃくとるゆごー |
| author\[\].another\_name | 作者別名 | ヴィクトル・ユーゴー |
| author\[\].list\_url | リストページURL |  |

---

## クレジット表示について

DMM Web サービスから提供されたAPIを利用して制作されたサイトやアプリケーションには、以下のクレジットを表示してください。

クレジットを表示する場合は、既定のHTMLソースを利用してください。表示規定が守られなかった場合、HTMLや画像に改変が行われた場合などには、DMM Web サービスが提供するAPIの利用を停止させていただく可能性があります。

### クレジットの種類

| サービス | テキスト形式 |
| :---- | :---- |
| DMM.com | Powered by [DMM.com Webサービス](https://affiliate.dmm.com/api/) |
| FANZA | Powered by [FANZA Webサービス](https://affiliate.dmm.com/api/) |

### DMM.com クレジット HTML

**画像形式 135px × 17px**

\<a href="https://affiliate.dmm.com/api/"\>\<img src="https://pics.dmm.com/af/web\_service/com\_135\_17.gif" width="135" height="17" alt="WEB SERVICE BY DMM.com" /\>\</a\>

**画像形式 88px × 35px**

\<a href="https://affiliate.dmm.com/api/"\>\<img src="https://pics.dmm.com/af/web\_service/com\_88\_35.gif" width="88" height="35" alt="WEB SERVICE BY DMM.com" /\>\</a\>

**テキスト形式**

Powered by \<a href="https://affiliate.dmm.com/api/"\>DMM.com Webサービス\</a\>

### FANZA クレジット HTML

**画像形式 135px × 17px**

\<a href="https://affiliate.dmm.com/api/"\>\<img src="https://p.dmm.co.jp/p/affiliate/web\_service/r18\_135\_17.gif" width="135" height="17" alt="WEB SERVICE BY FANZA" /\>\</a\>

**画像形式 88px × 35px**

\<a href="https://affiliate.dmm.com/api/"\>\<img src="https://p.dmm.co.jp/p/affiliate/web\_service/r18\_88\_35.gif" width="88" height="35" alt="WEB SERVICE BY FANZA" /\>\</a\>

**テキスト形式**

Powered by \<a href="https://affiliate.dmm.com/api/"\>FANZA Webサービス\</a\>

クレジットの種類を問わず、表示位置は自由ですが、そのアプリケーションやサイトがDMM Web サービスを利用し制作されていることがわかる方法で表示してください。  
