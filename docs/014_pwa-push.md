# 014 PWA・プッシュ通知

## 概要
PWAとしてホーム画面に追加できるようにし、値下げ・新作・推し女優日替わりのプッシュ通知を Web Push API で送信する。

## 依存
- 001 Supabase 初期設定（`notification_subscriptions` / `notification_queue` テーブル）
- 004 認証
- 008 価格監視 Cron

## 実装済み

### PWA 設定
- [x] `app/manifest.ts` を完成させる
- [x] アイコン（192×192 / 512×512 PNG）を `public/icons/` に配置
- [x] `public/sw.js` に Service Worker を作成
  - [x] オフラインキャッシュ（`/` と `/favorites` をネットワーク優先でキャッシュ）
  - [x] `push` イベントハンドラ（プッシュ通知受信・`showNotification`）
  - [x] `notificationclick` ハンドラ（通知タップで対象ページへ遷移）
- [x] `components/ServiceWorkerRegistration.tsx`（Client Component）で SW を登録

### プッシュ通知の購読
- [x] VAPID 鍵ペアを生成
  - 公開鍵: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（base64url 形式、ブラウザの `pushManager.subscribe` に渡す）
  - 秘密鍵: `VAPID_PRIVATE_KEY_JWK`（JWK JSON 形式で `.env.local` に保存）
  - 生成方法: `node -e "const {webcrypto}=require('crypto'); ..."`（下記参照）
- [x] `components/PushSubscribeButton.tsx` 作成（Client Component）
  - [x] `Notification.requestPermission()` で許可を取得
  - [x] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` が未設定の場合は早期 return（エラーを防ぐ）
  - [x] `pushManager.subscribe()` を try/catch でラップ（unhandled rejection 防止）
  - [x] 購読情報を `actions/push.ts` の Server Action 経由で Supabase `notification_subscriptions` に保存（claims をサーバー側で検証し admin client で upsert。ゲスト→ログイン時の `user_id` 引き継ぎにも対応）
  - [x] 購読解除も対応（`unsubscribe()` + DB 削除。endpoint 一致で削除）
- [x] 通知ベルボタンをマイページに配置

#### ゲストのセール速報購読（メール登録不要）
- セール速報（全員同一内容のブロードキャスト）は **ログイン不要**で購読できる。`saveSubscription` は未ログイン時 `user_id=null`・`notification_type='sale'` 固定で保存。
- 推し女優の新作 / お気に入りの値下げ / シリーズ新刊は**ユーザー固有データに依存するためログイン必須**（`NotifyChoiceSheet` でゲストは「要登録」表示 → `LoginPromptSheet` へ誘導）。
- ゲストが到達できる購読導線を `/welcome`（未ログイン分岐）と `/sale` に設置（`/mypage` はログイン必須のため）。
- 送信側: `lib/broadcast/sale-broadcast.ts` はログイン勢を `user_id`、ゲストを `endpoint` で識別して `notification_queue` に積む（ゲスト行は `endpoint` 列に送信先を保持）。`workers/push-notify.ts` は `user_id` があれば user_id で、なければ `endpoint` 直指定で購読を引いて送信。
- `/api/subscriber-count` は distinct `endpoint` で集計（ゲスト購読も実数に含む）。

### 通知送信（Next.js Route Handler）
- [x] `app/api/push/test/route.ts` — テスト用プッシュ送信エンドポイント
  - `x-revalidate-secret` ヘッダーで認証
  - `userId` を受け取り `notification_subscriptions` からサブスクリプションを取得
  - `web-push` ライブラリで暗号化・送信（RFC 8291/8292 準拠）
  - VAPID 秘密鍵は JWK の `d` フィールドを `web-push.setVapidDetails` に渡す
- [x] `app/api/oshi-notify/route.ts` — 推し女優日替わり通知エンドポイント
  - `x-revalidate-secret` ヘッダーで認証
  - `fetchDailyDealContents(50)` で日替わり商品の出演女優一覧を取得
  - `profiles.oshi_actress_id` と照合してマッチしたユーザーを抽出
  - 当日既に同タイプの通知を送ったユーザーはスキップ（`notification_queue` で確認）
  - マッチしたユーザーの通知を `notification_queue` に INSERT（`type: 'oshi_daily_deal'`）

### 通知送信（Cloudflare Workers）
- [x] `workers/push-notify.ts` — `notification_queue` から `pending` レコードを送信
- [x] `workers/daily-revalidate.ts` — 毎日 0:01 JST に以下を並列実行
  - `POST /api/revalidate`（トップページ ISR キャッシュ破棄）
  - `POST /api/oshi-notify`（推し女優日替わり通知キュー投入）

## ファイル構成

```
public/sw.js                             ← Service Worker
public/icons/icon-192.png                ← PWA アイコン
public/icons/icon-512.png                ← PWA アイコン
components/ServiceWorkerRegistration.tsx ← SW 登録 Client Component
components/PushSubscribeButton.tsx        ← 通知購読 UI
actions/push.ts                          ← saveSubscription / removeSubscription
app/api/push/test/route.ts               ← テスト通知送信エンドポイント
app/api/oshi-notify/route.ts             ← 推し女優日替わり通知エンドポイント
workers/push-notify.ts                   ← Web Push 送信 Worker
workers/push-notify.toml                 ← Worker 設定（cron: 15分ごと）
workers/daily-revalidate.ts              ← 日次リバリデート + 推し女優通知 Worker
workers/daily-revalidate.toml            ← Worker 設定（cron: 1 15 * * * = JST 0:01）
```

## 初期セットアップ

### VAPID キー生成（初回のみ）

```bash
node -e "
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;
async function main() {
  const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pubRaw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  const b64url = (buf) => Buffer.from(buf).toString('base64url');
  const privJwk = await subtle.exportKey('jwk', kp.privateKey);
  console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + b64url(pubRaw));
  console.log('VAPID_PRIVATE_KEY_JWK=' + JSON.stringify(privJwk));
}
main();
"
```

出力された値を `.env.local` に設定する。

**重要**: ブラウザでサブスクライブ後に VAPID 公開鍵を変更すると、既存のサブスクリプションが無効になる。変更した場合はユーザーに再サブスクライブを促すこと（通知ボタン OFF → ON）。

### web-push ライブラリ

```bash
pnpm add web-push @types/web-push
```

`app/api/push/test/route.ts` での使い方:
```typescript
import webpush from 'web-push'

const jwk = JSON.parse(process.env.VAPID_PRIVATE_KEY_JWK!) as { d?: string }
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  jwk.d!  // JWK の d フィールドが raw 秘密鍵（base64url）
)
await webpush.sendNotification({ endpoint, keys }, payload, { TTL: 60 })
```

### テスト送信

```bash
node -e "
const secret = 'YOUR_REVALIDATE_SECRET';
const payload = JSON.stringify({userId:'USER_ID',title:'テスト',message:'通知テスト'});
fetch('http://localhost:3000/api/push/test',{
  method:'POST',
  headers:{'x-revalidate-secret':secret,'Content-Type':'application/json'},
  body:payload
}).then(r=>r.json()).then(console.log);
"
```

※ curl の `-d` でマルチバイト文字を渡すとターミナルのエンコーディング次第で文字化けする。Node.js 経由で送ること。

### Worker シークレット登録

```bash
wrangler secret put SITE_URL           --config workers/daily-revalidate.toml
wrangler secret put REVALIDATE_SECRET  --config workers/daily-revalidate.toml
wrangler deploy --config workers/daily-revalidate.toml
```

## アーキテクチャ補足

### Web Push 暗号化
`web-push` ライブラリが RFC 8291 (aes128gcm) + RFC 8292 (VAPID) を実装済み。手動実装は不要。

### PushSubscribeButton の状態管理
- `unsupported`: Service Worker / Push Manager 非対応 → ボタン非表示
- `loading`: 購読状態確認中
- `denied`: 通知がブロック済み → 操作不可の状態表示のみ
- `unsubscribed`: 未購読 → 購読ボタン表示
- `subscribed`: 購読済み → 解除ボタン表示

### 推し女優通知フロー
1. Cloudflare Worker（daily-revalidate）が毎日 0:01 JST に `/api/oshi-notify` を POST
2. oshi-notify が日替わり商品の出演女優と `profiles.oshi_actress_id` を照合
3. マッチしたユーザーを `notification_queue`（type: `oshi_daily_deal`）に INSERT
4. push-notify Worker（15分ごと）が `notification_queue` を消化して Web Push 送信

## 既知の制限・注意事項
- iOS Safari は Web Push 対応だが、ホーム画面追加済みの PWA として動作している場合のみ受信可能
- Windows では「設定 → システム → 通知 → Google Chrome」が ON になっている必要がある
- Playwright は incognito モードで動作するため `pushManager.subscribe()` が失敗する（Chrome の制限）
- ペイロードの最大サイズ: 4080 bytes
- curl で日本語を含む JSON を送ると文字化けする場合がある。Node.js の `fetch` を使うこと
