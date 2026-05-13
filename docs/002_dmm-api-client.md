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
