# 006 セール・ランキング特化ページ（最優先）

## 概要
ベントーグリッドUIで、セール作品・週間ランキング・新人作品を表示するトップページ兼セールページ。独自スコアでランキング自動生成。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト

## TODO

### ページ・ルーティング
- [x] `app/page.tsx` - トップページ（クーポンバナー + ランキングBentoGrid + 新着、Suspenseストリーミング）
- [x] `app/sale/page.tsx` - セール一覧（ISR revalidate: 3600、割引率降順ソート）
- [x] `app/ranking/page.tsx` - ランキング（日次/週次/月次/新着タブ切替、searchParamsで動的）

### 商品カードコンポーネント
- [x] `components/product/ProductCard.tsx` 作成
  - [x] 取消線定価 + 赤字現在価格 + 割引率バッジ（5%以上のみ表示）
  - [ ] 残時間カウントダウン（DMM APIにセール終了日フィールドなし、将来対応）
  - [x] 星評価（`review.average` + `review.count`）
  - [x] `next/image` で画像表示（SVG blurDataURL プレースホルダー付き）
  - [x] アフィリエイトリンクに `rel="noopener noreferrer"` と PR バッジ
- [x] `components/product/ProductCardSkeleton.tsx` - 005で実装済み（`components/ui/ProductCardSkeleton.tsx`）

### ベントーグリッド
- [x] `components/layout/BentoGrid.tsx` 作成
  - [x] 大タイル（hero: col-span-2 / md:row-span-2）・小タイル（1×1）の混在レイアウト
  - [x] モバイル: 2カラム / タブレット以上: 4カラム
- [x] 常時固定バナー: FANZA同人90%OFFクーポン情報（アフィリエイトリンク付き）

### ランキング生成
- [x] `lib/ranking.ts` に独自スコア計算関数を実装
  - [x] スコア = `review.average × Math.log(review.count + 1) × 新しさ係数`
  - [x] 新しさ係数 = 30日以内1.5倍 / 90日以内1.2倍 / それ以上1.0倍
  - [x] `sortByRankingScore` / `sortByDiscount` / `parsePrice` / `calcDiscountRate` ユーティリティ
- [ ] ランキング軸ジャンル別・新人・検索急上昇（将来の拡張）

### データフェッチ
- [x] ランキング・新着を Suspense で独立ストリーミング（バナーは即表示）
- [x] ISR revalidate: 3600（トップ・セールページ）

### SEO・OGP
- [x] `app/page.tsx` / `app/ranking/page.tsx` に `metadata` export でメタ情報設定
- [x] 構造化データ（JSON-LD）: `ItemList` スキーマをランキング・トップページに出力

### PR表記
- [x] ProductCard に「PR」バッジを全カード右上に表示
- [x] クーポンバナーに「PR · PICKUP」表記
