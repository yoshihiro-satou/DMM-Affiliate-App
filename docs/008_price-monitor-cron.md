# 008 価格監視・Cloudflare Workers Cron

## 概要
Cloudflare Workers の cron トリガーで毎時 DMM API を叩き、価格変動を検知して `sale_queue` に積む。X投稿（015）・プッシュ通知（014）のデータソースになる。

## 依存
- 001 Supabase 初期設定
- 002 DMM API クライアント

## TODO

### Workers スクリプト
- [ ] `workers/price-monitor.ts` 作成
  - [ ] `scheduled(event, env, ctx)` ハンドラを実装
  - [ ] お気に入り登録数上位100件の `item_id` を Supabase から取得
  - [ ] DMM API `ItemList` で現在価格を取得（`Promise.all` で並列、最大10件ずつバッチ処理）
  - [ ] `price_history` テーブルの最新価格と比較
  - [ ] 値下がり検知（かつ割引率10%以上）→ `sale_queue` に INSERT
    - [ ] 重複防止: 同一 `item_id` が72時間以内に `sale_queue` にあればスキップ
  - [ ] `price_history` に新しい価格レコードを INSERT

### wrangler.toml 設定
- [ ] `workers/wrangler.toml` を作成
  - [ ] `[[triggers]] crons = ["0 * * * *"]`（毎時0分）
  - [ ] Supabase の環境変数バインディングを設定
  - [ ] DMM API キーの環境変数バインディングを設定

### デプロイ
- [ ] `wrangler deploy workers/price-monitor.ts` でデプロイ
- [ ] Cloudflare Dashboard で cron 実行ログを確認

### テスト
- [ ] `wrangler dev --test-scheduled` でローカルトリガーテスト
- [ ] 価格変動を手動で Supabase に書き込んで `sale_queue` に追加されることを確認
