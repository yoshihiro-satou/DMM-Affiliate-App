# 006 セール・ランキング特化ページ（最優先）

## 概要
ベントーグリッドUIで、セール作品・週間ランキング・新人作品を表示するトップページ兼セールページ。独自スコアでランキング自動生成。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト

## TODO

### ページ・ルーティング
- [ ] `app/page.tsx` - トップページ（セール＋ランキングのベントーグリッド）
- [ ] `app/sale/page.tsx` - セール一覧（ISR revalidate: 3600）
- [ ] `app/ranking/page.tsx` - ランキング（日次/週次/月次タブ切替、ISR revalidate: 3600）

### 商品カードコンポーネント
- [ ] `components/product/ProductCard.tsx` 作成
  - [ ] 取消線定価 + 赤字現在価格 + 割引率バッジ
  - [ ] 残時間カウントダウン（セール終了日がある場合）
  - [ ] 星評価（`review.average` + `review.count`）
  - [ ] `next/image` で画像表示（blurDataURL プレースホルダー付き）
  - [ ] アフィリエイトリンクに `rel="noopener noreferrer"` と PR 表記
- [ ] `components/product/ProductCardSkeleton.tsx` - ローディング用

### ベントーグリッド
- [ ] `components/layout/BentoGrid.tsx` 作成
  - [ ] 大タイル（2×2）・中タイル（2×1）・小タイル（1×1）の混在レイアウト
  - [ ] モバイル: 2カラム / タブレット以上: 4カラム
- [ ] 常時固定バナー: FANZA同人90%OFFクーポン情報

### ランキング生成
- [ ] `lib/ranking.ts` に独自スコア計算関数を実装
  - [ ] スコア = `review.average × Math.log(review.count + 1) × 新しさ係数`
  - [ ] 新しさ係数 = 発売から30日以内なら1.5倍、90日以内なら1.2倍
- [ ] ランキング軸: 日次 / 週次 /月次 / ジャンル別 / 新人 / 検索急上昇

### データフェッチ
- [ ] `Promise.all()` で複数エンドポイントを並列フェッチ
- [ ] `<Suspense>` でランキングセクションをストリーミング（バナーは即表示）

### SEO・OGP
- [ ] `app/page.tsx` に `generateMetadata` でサイト共通メタ情報設定
- [ ] 構造化データ（JSON-LD）: `ItemList` スキーマでランキングを出力

### PR表記
- [ ] すべての商品カード・アフィリンク周辺に「PR」表記を入れる
