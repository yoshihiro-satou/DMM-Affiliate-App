# 011 シリーズ完走トラッカー

## 概要
同人・電子書籍フロアのシリーズ全巻を自動取得し、既読/未読トラッキング・新刊通知・まとめ買い導線を提供する。

## 依存
- 001 Supabase 初期設定
- 002 DMM API クライアント
- 004 認証

## TODO

### データ取得
- [ ] `lib/dmm/series.ts` 作成
  - [ ] `fetchSeriesItems(seriesId)`: `SeriesSearch` + `ItemList` でシリーズ全巻を取得
  - [ ] 取得結果をシリーズ順（巻数・発売日）でソート

### ページ
- [ ] `app/series/[id]/page.tsx` 作成
  - [ ] シリーズ全巻一覧グリッド表示
  - [ ] 進捗バー: 「3巻読了 / 全8巻」を視覚化
  - [ ] 「あと○巻で完走」テキスト
  - [ ] `generateMetadata`: シリーズ名・画像でOGP生成
- [ ] `app/series/page.tsx` - フォロー中シリーズ一覧（ログイン必須）

### 既読トラッキング
- [ ] Supabase `series_progress` テーブル追加（user_id, series_id, item_id, status）
- [ ] RLS 設定（本人のみ読み書き可）
- [ ] `actions/series.ts` 作成
  - [ ] `markAsRead(itemId, seriesId)`: 既読マーク → `revalidatePath`
  - [ ] `markAsUnread(itemId, seriesId)`: 未読に戻す

### まとめ買い導線
- [ ] 「未読をまとめて購入」ボタン: 未読作品の `affiliateURL` を一括で新タブ表示
- [ ] 「全巻まとめてFANZAで開く」ボタン（既読不問）

### 新刊監視（Cloudflare Workers との連携）
- [ ] `workers/series-monitor.ts` 作成
  - [ ] フォロー中シリーズの最新巻を毎日1回チェック
  - [ ] 新刊検知 → `notification_queue` に追加（014 プッシュ通知で送信）
- [ ] `wrangler.toml` に `crons = ["0 9 * * *"]`（毎朝9時）を追加
