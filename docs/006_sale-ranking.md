# 006 セール・ランキング特化ページ（最優先）

## 概要
ベントーグリッドUIで、セール作品・週間ランキング・新人作品を表示するトップページ兼セールページ。独自スコアでランキング自動生成。

## 依存
- 002 DMM API クライアント
- 005 モバイルレイアウト

## TODO

### ページ・ルーティング
- [x] `app/page.tsx` - トップページ（クーポンバナー + ランキングBentoGrid + おすすめ、Suspenseストリーミング）
- [x] `app/sale/page.tsx` - セール一覧（ISR revalidate: 3600、割引率降順ソート）
- [x] `app/ranking/page.tsx` - ランキング（日次/週次/月次/人気女優タブ切替、searchParamsで動的）

### 商品カードコンポーネント
- [x] `components/product/ProductCard.tsx` 作成（ランキング・セールページ用）
  - [x] 取消線定価 + 赤字現在価格 + 割引率バッジ（5%以上のみ表示）
  - [ ] 残時間カウントダウン（DMM APIにセール終了日フィールドなし、将来対応）
  - [x] 星評価（`review.average` + `review.count`）
  - [x] `next/image` で画像表示（SVG blurDataURL プレースホルダー付き）
  - [x] アフィリエイトリンクに `rel="noopener noreferrer"` と PR バッジ
  - [x] **画像選択**: `sampleImageURL.sample_l[9]→[8]→[7]→[6]→[0]→imageURL.list/large/small` の優先順
- [x] `components/product/GridCard.tsx` 作成（ホームページグリッド専用）
  - [x] **画像選択**: `sampleImageURL.sample_l[9]→[8]→[7]→[6]→[0]→imageURL.list/large/small` の優先順
    - サンプル画像は後ろ（高インデックス）ほど本編に近いカットが多いため後方から取得
  - [x] **アスペクト比**: `aspect-video`（16:9）+ `object-contain`（サンプル画像がランドスケープのため）
  - [x] `featured` prop: `true` のとき `col-span-2 row-span-2`（大カード）、タイトル・価格をグラデーションオーバーレイ表示
  - [x] `featured: false`（小カード）のとき、テキストは画像下に配置
  - [x] PRバッジ・割引バッジ・ランクバッジを画像上にオーバーレイ
- [x] `components/ui/ProductCardSkeleton.tsx` - 005で実装済み（`components/ui/ProductCardSkeleton.tsx`）

### ベントーグリッド
- [x] `components/layout/BentoGrid.tsx` 作成
  - [x] **不規則パターン**: `[true, false, false, false, true, false, false, true, false, false, false, false]` の12要素配列でサイクル
    - ギャップが 3→2→4 と変化し、等間隔にならずランダム感が出る
  - [x] `grid-auto-flow: dense` で空きを自動充填
  - [x] モバイル: 2カラム / デスクトップ: 4カラム
  - [x] `GridCard` を使用（`ProductCard` から分離）
- [x] 常時固定バナー: FANZA同人90%OFFクーポン情報（アフィリエイトリンク付き）

### あなたへのおすすめセクション（トップページ）
- [x] `components/recommend/ForYouFeed.tsx` - 「あなたへのおすすめ」セクション
  - [x] `GridCard` + BENTO_PATTERN を使用（本日のおすすめと同デザイン）
  - [x] `grid-flow-dense` + `grid-cols-2` で大小混在グリッド
  - [x] スケルトン: `ProductCardSkeleton` + BENTO_PATTERN でローディング時も同形状を維持
  - [x] セクションヘッダー: タイトル左・「もっと見る →」右寄せ
- [x] 「もっと見る」リンクのスタイル: `text-[13px] font-bold text-red-400 hover:text-red-300 active:text-red-500`
  - 遷移先: `/ranking`（ランキングページ）

### ランキング生成
- [x] `lib/ranking.ts` に独自スコア計算関数を実装
  - [x] スコア = `review.average × Math.log(review.count + 1) × 新しさ係数`
  - [x] 新しさ係数 = 30日以内1.5倍 / 90日以内1.2倍 / それ以上1.0倍
  - [x] `sortByRankingScore` / `sortByDiscount` / `parsePrice` / `calcDiscountRate` ユーティリティ
- [ ] ランキング軸ジャンル別・新人・検索急上昇（将来の拡張）

### ランキングタブ
- [x] `components/ranking/RankingTabs.tsx` - タブ切替（Client Component）
  - タブ構成: `日次 / 週次 / 月次 / 人気女優`（旧「新着」→「人気女優」に変更）
  - `RankingPeriod` 型は `RANKING_PERIODS` as const から自動導出
- [x] `app/ranking/page.tsx` - 各タブのデータフェッチ戦略
  - **日次**: `sort: 'rank'`, `offset: 1`（上位1〜40位）
  - **週次**: `sort: 'rank'`, `offset: 41`（上位41〜80位）+ 独自スコアで並び替え
  - **月次**: `sort: 'review'`（評価順）+ 独自スコアで並び替え
  - **人気女優**: `fetchPopularActresses()` で取得（後述）
  - ⚠️ `React.cache()` は同一パラメータのフェッチを重複排除するため、日次と週次は必ず `offset` を変えて区別する
- [x] **人気女優タブ** (`fetchPopularActresses`)
  - レビュー上位100件から出演女優の登場回数をカウントし、上位12名をランキング
  - 各女優の詳細を `fetchActressList({ actress_id })` で並列取得（`Promise.all` × 12件）
  - セクション注記: `PR · レビュー上位作品への出演数順`
  - 表示: `ActressCard` で `grid-cols-2 gap-3` グリッド

### 日替わり商品セクション（トップページ）

- [x] `components/home/DailyDealsSection.tsx` — Server Component、`BentoGrid` で統一デザイン表示
- [x] `lib/dmm/daily-deals.ts` — `React.cache()` でリクエスト内重複排除、GraphQL失敗時は `fetchDailySaleItems` にフォールバック
- [x] `lib/dmm/scraper.ts` — `api.video.dmm.co.jp/graphql` への POST（`AvSearch` / `legacySearchPPV`）
  - フィルタ: `saleIds: { ids: [{ id: "daily" }], op: "AND" }, floor: "AV"`
  - **なぜ GraphQL か**: `video.dmm.co.jp/av/list/?campaign=daily` は CSR（Next.js App Router）のため HTML スクレイピング不可。Playwright でネットワークキャプチャして内部 GraphQL エンドポイントを特定
  - **クエリは元のまま使用**: サーバーがスキーマ検証するため簡略化クエリは 422 になる
  - **`cache: 'no-store'` は不要**: POST リクエストは Next.js がデフォルトでキャッシュしない。指定すると ISR と競合して静的生成が失敗する
- [x] `app/api/revalidate/route.ts` — `x-revalidate-secret` ヘッダーで認証し `revalidatePath('/')` を実行するエンドポイント
- [x] `workers/daily-revalidate.ts` + `workers/daily-revalidate.toml` — 毎日 0:01 JST（`"1 15 * * *"` UTC）にリバリデートエンドポイントを呼び出す Cloudflare Worker Cron

#### デプロイ手順（daily-revalidate）
```bash
# シークレット生成
openssl rand -hex 32   # → REVALIDATE_SECRET

wrangler secret put SITE_URL           --config workers/daily-revalidate.toml
wrangler secret put REVALIDATE_SECRET  --config workers/daily-revalidate.toml
wrangler deploy --config workers/daily-revalidate.toml
```

#### GraphQL レスポンスの DmmItem マッピング
| GraphQL フィールド | DmmItem フィールド |
|---|---|
| `id` | `content_id` |
| `packageImage.mediumUrl` | `imageURL.list` / `small` |
| `packageImage.largeUrl` | `imageURL.large` |
| `salesInfo.lowestPrice.discountPrice` | `prices.price`（セール価格） |
| `salesInfo.lowestPrice.price` | `prices.list_price`（定価） |
| `salesInfo.campaign.endAt` | `campaign[].date_end`（ISO→YYYY-MM-DD） |
| `review.average`（number） | `review.average`（String に変換） |
| `sampleMovie.mp4Url` | `sampleMovieURL.size_560_360` |

### データフェッチ
- [x] ランキング・おすすめ・日替わりを Suspense で独立ストリーミング（バナーは即表示）
- [x] ISR revalidate: 3600（トップ・セールページ）
- [x] 日替わりデータは 0:01 JST に Cloudflare Worker Cron が `revalidatePath('/')` を呼び出して最新化

### SEO・OGP
- [x] `app/page.tsx` / `app/ranking/page.tsx` に `metadata` export でメタ情報設定
- [x] 構造化データ（JSON-LD）: `ItemList` スキーマをランキング・トップページに出力

### PR表記
- [x] ProductCard に「PR」バッジを全カード右上に表示
- [x] クーポンバナーに「PR · PICKUP」表記
- [x] ランキングページ各セクションヘッダーに「PR · FANZAアフィリエイトリンク」表記

## 追加（2026-06）: VR除外・セール速報ナッジ

### 非日替わりセクションの VR 除外
- [x] `lib/dmm/client.ts` に `isVrItem(item)` を追加（ジャンル名に「VR」を含む or タイトルが「【VR】」プレフィックス）
- [x] `fetchItemListMixed` に `excludeVr` オプションを追加（デフォルト false。discover/search には影響なし）
- [x] ホームの「今週のランキング」「本日のおすすめ（fallback）」で `excludeVr: true`
- [x] 「あなたへのおすすめ」(`app/api/recommend/route.ts`) も `isVrItem` で除外（ゲスト/ログイン/ジャンル/女優の各候補）
- [x] 「日替わり（今日だけの特別価格）」は対象外（VRを残す）。`fetchDailySaleItems` は従来どおり VR を除外

### セール速報ナッジ（/sale）
- [x] `components/push/usePushSubscribe.ts` に購読ロジックを集約（`PushSubscribeButton` と共有）
- [x] `components/sale/SaleNotifyNudge.tsx`：一定スクロール（高インテント）後に控えめなバナーで「セール速報を受け取る（登録不要）」を提示。購読済み/ブロック中/非対応/7日以内に閉じた場合は非表示（`useSyncExternalStore` で localStorage 判定）
