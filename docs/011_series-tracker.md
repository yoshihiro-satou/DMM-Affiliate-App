# 011 シリーズ完走トラッカー

## 概要
同人・電子書籍フロアのシリーズ全巻を自動取得し、既読/未読トラッキング・新刊通知・まとめ買い導線を提供する。

## 依存
- 001 Supabase 初期設定
- 002 DMM API クライアント
- 004 認証

## 実装済み（2026-05-15）

### データ取得
- [x] `lib/dmm/series.ts` 作成
  - [x] `fetchSeriesItems(seriesId)`: `ItemList` で `article=series` + `article_id` を使いシリーズ全巻を取得
  - [x] 取得結果をシリーズ順（発売日昇順 = 古い順）でソート

### ページ
- [x] `app/series/[id]/page.tsx` 作成
  - [x] シリーズ全巻一覧グリッド表示
  - [x] 進捗バー: 「3巻読了 / 全8巻」を視覚化
  - [x] 「あと○巻で完走」テキスト（完走時は「完走達成!」）
  - [x] `generateMetadata`: シリーズ名・画像でOGP生成
- [x] `app/series/page.tsx` - フォロー中シリーズ一覧（ログイン必須・未ログインは /login にリダイレクト）

### 既読トラッキング
- [x] Supabase `series_progress` テーブル追加（user_id, series_id, item_id, status）
- [x] RLS 設定（本人のみ読み書き可）
- [x] `actions/series.ts` 作成
  - [x] `markAsRead(itemId, seriesId)`: 既読マーク → `revalidatePath`
  - [x] `markAsUnread(itemId, seriesId)`: 未読に戻す（DB から削除）
  - [x] `followSeries(seriesId, seriesName)`: フォロー → `followed_series` に追加
  - [x] `unfollowSeries(seriesId)`: フォロー解除

### フォロー機能
- [x] Supabase `followed_series` テーブル追加（user_id, series_id, series_name, latest_item_id）
- [x] RLS 設定（本人のみ読み書き可）
- [x] `app/series/[id]/_components/FollowButton.tsx` — オプティミスティック UI

### まとめ買い導線
- [x] 「未読をまとめて購入」ボタン: 未読作品の `affiliateURL` を最大10件新タブ表示（`BulkBuyButton`）
- [x] 「全巻FANZAで開く」ボタン（既読不問）

### 通知キュー
- [x] Supabase `notification_queue` テーブル追加（014 プッシュ通知で使用）
  - カラム: id / user_id / type（new_release | price_drop | badge）/ payload（JSONB）/ status / sent_at

### 新刊監視（Cloudflare Workers との連携）
- [x] `workers/series-monitor.ts` 作成
  - [x] フォロー中シリーズの最新巻を毎日1回チェック（series_id でグループ化し API 呼び出しを最小化）
  - [x] 新刊検知 → `notification_queue` に追加（014 プッシュ通知で送信）
- [x] `workers/series-monitor.toml` に `crons = ["0 9 * * *"]`（毎朝9時）を設定

## ファイル構成

```
lib/dmm/series.ts
actions/series.ts
app/series/page.tsx
app/series/[id]/page.tsx
app/series/[id]/_components/ReadToggleButton.tsx
app/series/[id]/_components/FollowButton.tsx
app/series/[id]/_components/BulkBuyButton.tsx
workers/series-monitor.ts
workers/series-monitor.toml
types/supabase.ts              ← series_progress / followed_series / notification_queue 追加
```

## デプロイ手順（シリーズモニター）

```bash
# secrets を登録してデプロイ
wrangler secret put SUPABASE_URL          --config workers/series-monitor.toml
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/series-monitor.toml
wrangler secret put DMM_API_ID            --config workers/series-monitor.toml
wrangler secret put DMM_AFFILIATE_ID      --config workers/series-monitor.toml
wrangler deploy                           --config workers/series-monitor.toml
```

## 制限・既知の挙動
- シリーズ最大取得件数 100 件（DMM API `hits` 上限）。100 巻超のシリーズは最新 100 巻のみ表示
- まとめ購入ボタンはブラウザのポップアップブロック対策で最大 10 件まで同時オープン
- `article=series&article_id=<id>` の `article_id` は DMM API の series article_id（DmmItem.iteminfo.series[].id）
