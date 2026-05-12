# 001 Supabase 初期設定・DB設計・RLS

## 概要
Supabase プロジェクトの作成からテーブル設計・RLS設定・型生成まで、データ層の基盤を整える。

## 依存
なし（最初に完了させる）

## TODO

### プロジェクト設定
- [ ] Supabase Dashboard でプロジェクト作成（東京リージョン推奨）
- [ ] `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` を設定
- [ ] `lib/supabase/client.ts` 作成（ブラウザ用）
- [ ] `lib/supabase/server.ts` 作成（Server Component / Server Action 用・`React.cache()` 適用）
- [ ] `lib/supabase/middleware.ts` 作成（トークンリフレッシュ用）

### テーブル設計
- [ ] `profiles` テーブル（id, display_name, email, created_at）
- [ ] `favorites` テーブル（id, user_id, item_id, item_title, image_url, price, created_at）
- [ ] `swipe_history` テーブル（id, user_id, item_id, direction, created_at）
- [ ] `price_history` テーブル（id, item_id, price, fetched_at）
- [ ] `sale_queue` テーブル（id, item_id, item_title, original_price, sale_price, discount_rate, affiliate_url, posted, last_posted_at, created_at）
- [ ] `user_badges` テーブル（id, user_id, badge_type, earned_at）
- [ ] `notification_subscriptions` テーブル（id, user_id, endpoint, keys, created_at）

### RLS 設定
- [ ] 全テーブルで Row Level Security を有効化
- [ ] `profiles`: 本人のみ読み書き可
- [ ] `favorites`: 本人のみ読み書き可
- [ ] `swipe_history`: 本人のみ読み書き可
- [ ] `price_history`: 全員読み取り可（書き込みはサービスロールのみ）
- [ ] `sale_queue`: サービスロールのみ読み書き可
- [ ] `user_badges`: 本人のみ読み取り可（書き込みはサービスロールのみ）
- [ ] `notification_subscriptions`: 本人のみ読み書き可

### トリガー・関数
- [ ] `handle_new_user()` 関数作成（auth.users に INSERT → profiles に自動作成）
- [ ] `on_auth_user_created` トリガー設定

### 型生成
- [ ] `supabase gen types typescript --local > types/supabase.ts` を実行
- [ ] `package.json` の scripts に `"db:types": "supabase gen types typescript --local > types/supabase.ts"` を追加
