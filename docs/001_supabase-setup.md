# 001 Supabase 初期設定・DB設計・RLS

## 概要
Supabase プロジェクトの作成からテーブル設計・RLS設定・型生成まで、データ層の基盤を整える。

## 依存
なし（最初に完了させる）

## TODO

### プロジェクト設定
- [x] Supabase Dashboard でプロジェクト作成（東京リージョン推奨）
- [x] `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` を設定
- [x] `lib/supabase/client.ts` 作成（ブラウザ用）
- [x] `lib/supabase/server.ts` 作成（Server Component / Server Action 用・`React.cache()` 適用）
- [x] `lib/supabase/middleware.ts` 作成（トークンリフレッシュ用）

### テーブル設計
- [x] `profiles` テーブル（id, display_name, email, created_at）
- [x] `favorites` テーブル（id, user_id, item_id, item_title, image_url, price, created_at）
- [x] `swipe_history` テーブル（id, user_id, item_id, direction, created_at）
- [x] `price_history` テーブル（id, item_id, price, fetched_at）
- [x] `sale_queue` テーブル（id, item_id, item_title, original_price, sale_price, discount_rate, affiliate_url, posted, last_posted_at, created_at）
- [x] `user_badges` テーブル（id, user_id, badge_type, earned_at）
- [x] `notification_subscriptions` テーブル（id, user_id, endpoint, keys, created_at）

### RLS 設定
- [x] 全テーブルで Row Level Security を有効化
- [x] `profiles`: 本人のみ読み書き可
- [x] `favorites`: 本人のみ読み書き可
- [x] `swipe_history`: 本人のみ読み書き可
- [x] `price_history`: 全員読み取り可（書き込みはサービスロールのみ）
- [x] `sale_queue`: サービスロールのみ読み書き可
- [x] `user_badges`: 本人のみ読み取り可（書き込みはサービスロールのみ）
- [x] `notification_subscriptions`: 本人のみ読み書き可

### トリガー・関数
- [x] `handle_new_user()` 関数作成（auth.users に INSERT → profiles に自動作成）
- [x] `on_auth_user_created` トリガー設定

### 型生成
- [x] `types/supabase.ts` 作成（スキーマから手動生成）
- [x] `package.json` の scripts に `"db:types": "supabase gen types typescript --project-id ilaszemqlacscbaewyox > types/supabase.ts"` を追加

## 備考
- `sale_queue.affiliate_url`: DMM規約（Article 8）でDMMへのリンク必須のため `item_url` でなく `affiliate_url` として定義
- `proxy.ts`: Next.js 16 で `middleware.ts` は非推奨。`proxy` 関数エクスポートに変更済み
- `types/supabase.ts`: `supabase login` 後に `pnpm db:types` で最新スキーマから再生成可能
