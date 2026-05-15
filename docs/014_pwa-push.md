# 014 PWA・プッシュ通知

## 概要
PWAとしてホーム画面に追加できるようにし、値下げ・新作・シリーズ新刊のプッシュ通知を Web Push API で送信する。

## 依存
- 001 Supabase 初期設定（`notification_subscriptions` テーブル）
- 004 認証
- 008 価格監視 Cron

## 実装済み（2026-05-15）

### PWA 設定
- [x] `app/manifest.ts` を完成させる
  - [x] `name` / `short_name` / `description` / `start_url`
  - [x] `theme_color` / `background_color` (#080808)
  - [x] `display: "standalone"` でアプリ風表示
- [x] アイコン（192×192 / 512×512 PNG）を `public/icons/` に配置
  - [x] `scripts/generate-vapid-keys.mjs` と同様、`node` で生成（`scripts/` に生成スクリプト相当）
  - デザイン用途では差し替え推奨（現状は赤枠＋F字のプレースホルダー）
- [x] `public/sw.js` に Service Worker を作成
  - [x] オフラインキャッシュ（`/` と `/favorites` をネットワーク優先でキャッシュ）
  - [x] `push` イベントハンドラ（プッシュ通知受信・`showNotification`）
  - [x] `notificationclick` ハンドラ（通知タップで対象ページへ遷移）
- [x] `components/ServiceWorkerRegistration.tsx`（Client Component）で SW を登録
  - [x] `app/layout.tsx` に追加済み（全ページ共通）

### プッシュ通知の購読
- [x] VAPID 鍵ペアを生成
  - [x] `scripts/generate-vapid-keys.mjs` で生成コマンドを提供
  - [x] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY_JWK` を環境変数へ追加（`.env.example` 参照）
- [x] `components/PushSubscribeButton.tsx` 作成（Client Component）
  - [x] `Notification.requestPermission()` で許可を取得
  - [x] `serviceWorker.ready.pushManager.subscribe()` で購読
  - [x] 購読情報を `actions/push.ts` の Server Action 経由で Supabase `notification_subscriptions` に保存
  - [x] 購読解除も対応（`unsubscribe()` + DB 削除）
  - [x] 状態表示: 通知オン / 通知オフ / ブロック済み / 非対応（非対応の場合は非表示）
- [x] 通知ベルボタンをマイページに配置
  - [x] 未ログインでタップ → ログイン促進モーダル（`LoginPromptSheet`）

### 通知送信（Cloudflare Workers）
- [x] `workers/push-notify.ts` 作成
  - [x] RFC 8292 (VAPID) JWT を Web Crypto API (`ECDSA P-256`) で生成
  - [x] RFC 8291 (aes128gcm) ペイロード暗号化を Web Crypto API のみで実装（外部ライブラリ不要）
    - ECDH 共有秘密 → HKDF で CEK + Nonce 導出 → AES-128-GCM 暗号化
  - [x] `notification_queue` から `pending` レコードを取得 → ユーザーの購読情報へ送信
  - [x] 送信成功 → status を `sent` に更新
  - [x] 送信失敗（410/404 Gone）→ 期限切れ購読情報を自動削除
  - [x] HTTP GET でも手動実行可能（`fetch` ハンドラ）
- [x] `workers/push-notify.toml` 作成（cron: 15分ごと）

## ファイル構成

```
public/sw.js                            ← 新規（Service Worker）
public/icons/icon-192.png               ← 新規（PWA アイコン 192×192）
public/icons/icon-512.png               ← 新規（PWA アイコン 512×512）
scripts/generate-vapid-keys.mjs         ← 新規（VAPID キー生成スクリプト）
components/ServiceWorkerRegistration.tsx ← 新規（SW 登録 Client Component）
components/PushSubscribeButton.tsx       ← 新規（通知購読 UI）
actions/push.ts                         ← 新規（saveSubscription / removeSubscription）
workers/push-notify.ts                  ← 新規（Web Push 送信 Worker）
workers/push-notify.toml                ← 新規（Worker 設定）
app/layout.tsx                          ← ServiceWorkerRegistration 追加
app/mypage/page.tsx                     ← PushSubscribeButton 追加
.env.example                            ← VAPID 環境変数ドキュメント追加
tsconfig.json                           ← workers/ を exclude に追加（wrangler が個別コンパイル）
```

## 初期セットアップ

### VAPID キー生成（初回のみ）

```bash
node scripts/generate-vapid-keys.mjs
```

出力された値を以下に設定する:
- `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<公開鍵>`
- Cloudflare Workers secrets:
  ```bash
  wrangler secret put VAPID_PUBLIC_KEY     --name dmm-push-notify
  wrangler secret put VAPID_PRIVATE_KEY_JWK --name dmm-push-notify
  wrangler secret put VAPID_SUBJECT        --name dmm-push-notify  # mailto:xxx or https://xxx
  wrangler secret put SUPABASE_URL         --name dmm-push-notify
  wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name dmm-push-notify
  ```

### Worker デプロイ

```bash
wrangler deploy --config workers/push-notify.toml
```

## アーキテクチャ補足

### Service Worker の登録
`components/ServiceWorkerRegistration.tsx` が `app/layout.tsx` に組み込まれ全ページで実行される。
`useEffect` 内で `navigator.serviceWorker.register('/sw.js')` を呼び出す。

### Web Push 暗号化（RFC 8291 aes128gcm）
外部ライブラリなし・Web Crypto API のみで実装:
1. サーバー一時 ECDH キーペアを生成
2. ECDH でユーザー公開鍵との共有秘密を導出
3. HKDF（HMAC-SHA-256）で CEK (16 bytes) と Nonce (12 bytes) を導出
4. AES-128-GCM でペイロードを暗号化
5. aes128gcm コンテンツヘッダ（salt + rs + keyid）を付加

### PushSubscribeButton の状態管理
- `unsupported`: Service Worker / Push Manager 非対応 → ボタン非表示
- `loading`: 購読状態確認中
- `denied`: 通知がブロック → 操作不可の状態表示のみ
- `unsubscribed`: 未購読 → 購読ボタン表示
- `subscribed`: 購読済み → 解除ボタン表示

## テスト
- [ ] Chrome DevTools → Application → Service Workers でプッシュをシミュレート
- [ ] ホーム画面に追加してスプラッシュ画面が表示されることを確認
- [ ] オフライン時にキャッシュされたページ（`/`・`/favorites`）が表示されることを確認
- [ ] マイページで通知ボタンを押し、`notification_subscriptions` テーブルにレコードが作成されることを確認

## 制限・既知の挙動
- iOS Safari (16.4+) は Web Push 対応だが、必ずホーム画面に追加済みの PWA として動作していないと受信不可
- Firefox (Android) は `PushManager` を要求するが VAPID 必須
- `public/icons/` のアイコンはプレースホルダー。本番前にデザインされた PNG に差し替えること
- ペイロードの最大サイズ: 4080 bytes（aes128gcm の 1 レコードサイズ制限）
