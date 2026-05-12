# 014 PWA・プッシュ通知

## 概要
PWAとしてホーム画面に追加できるようにし、値下げ・新作・シリーズ新刊のプッシュ通知を Web Push API で送信する。

## 依存
- 001 Supabase 初期設定（`notification_subscriptions` テーブル）
- 004 認証
- 008 価格監視 Cron

## TODO

### PWA 設定
- [ ] `app/manifest.ts` を完成させる
  - [ ] `name` / `short_name` / `description` / `start_url`
  - [ ] `theme_color` / `background_color`
  - [ ] アイコン（192×192 / 512×512 PNG）を `public/` に配置
  - [ ] `display: "standalone"` でアプリ風表示
- [ ] `public/sw.js` にService Worker を作成
  - [ ] オフラインキャッシュ（ランキング・お気に入りページ）
  - [ ] `push` イベントハンドラ（プッシュ通知受信）
  - [ ] `notificationclick` ハンドラ（通知タップで対象ページへ遷移）

### プッシュ通知の購読
- [ ] VAPID 鍵ペアを生成して環境変数に追加
  - [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
- [ ] `components/PushSubscribeButton.tsx` 作成（Client Component）
  - [ ] `Notification.requestPermission()` で許可を取得
  - [ ] `serviceWorker.ready.pushManager.subscribe()` で購読
  - [ ] 購読情報を Server Action 経由で Supabase `notification_subscriptions` に保存
- [ ] 通知ベルボタンをボトムナビ or マイページに配置
  - [ ] 未ログインでタップ → ログイン促進モーダル（004 と連携）

### 通知送信（Cloudflare Workers）
- [ ] `workers/push-notify.ts` 作成
  - [ ] `web-push` ライブラリで通知を送信
  - [ ] 値下げ通知: `sale_queue` から未通知のレコードを取得 → 対象ユーザーの購読情報を検索 → 送信
  - [ ] 新刊通知: `notification_queue` から取得 → 送信
  - [ ] 送信失敗（410 Gone）の購読情報は自動削除

### テスト
- [ ] Chrome DevTools → Application → Service Workers でプッシュをシミュレート
- [ ] ホーム画面に追加してスプラッシュ画面が表示されることを確認
- [ ] オフライン時にキャッシュされたページが表示されることを確認
