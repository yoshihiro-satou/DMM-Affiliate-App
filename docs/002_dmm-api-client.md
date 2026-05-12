# 002 DMM API クライアント・型定義

## 概要
DMM API v3 への安全なサーバーサイドアクセス基盤を構築する。APIキーはサーバー専用。`NEXT_PUBLIC_` 厳禁。

## 依存
なし

## TODO

### 型定義
- [ ] `types/dmm.ts` に DMM API レスポンスの Zod スキーマ・型を定義
  - [ ] `DmmItem`（title / affiliateURL / imageURL / sampleMovieURL / prices / review / iteminfo）
  - [ ] `DmmActress`（id / name / ruby / bust / waist / hip / height / birthday / imageURL）
  - [ ] `DmmItemListResponse` / `DmmActressResponse`

### APIクライアント
- [ ] `lib/dmm/client.ts` 作成
  - [ ] `fetchItemList(params)` - 商品一覧取得（sort / keyword / article / hits / offset）
  - [ ] `fetchActressList(params)` - 女優一覧取得
  - [ ] `fetchFloorList()` - フロア一覧取得
  - [ ] すべての関数でサーバー側のみ実行されることを `server-only` パッケージで保証
  - [ ] レート制限対策: 連続リクエスト時に 500ms スリープ挟む実装

### Route Handler（API Proxy）
- [ ] `app/api/dmm/items/route.ts` - クライアントからのフェッチ用プロキシ
- [ ] `app/api/dmm/actresses/route.ts`
- [ ] Route Handler 側で Zod バリデーション実施

### キャッシュ戦略
- [ ] `fetch` に `next: { revalidate: 3600 }` を設定（商品データは1時間キャッシュ）
- [ ] `React.cache()` で同一リクエスト内の重複フェッチを排除
- [ ] `next.config.ts` に `optimizePackageImports: ['lucide-react']` を追加
