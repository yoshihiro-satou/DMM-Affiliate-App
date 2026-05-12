# 013 ゲーミフィケーション・バッジ・ポイント

## 概要
金銭換算なしの独自ポイント・バッジ。資金決済法の対象外。毎日ログイン・お気に入り・シリーズ完走などのアクションでバッジを付与し、リテンションを高める。

## 依存
- 001 Supabase 初期設定
- 004 認証
- 007 お気に入り

## TODO

### バッジ定義
- [ ] `lib/badges.ts` にバッジ一覧を定義
  - [ ] `WELCOME` - 初回ログイン
  - [ ] `STREAK_3` / `STREAK_7` / `STREAK_30` - 連続ログイン3日/7日/30日
  - [ ] `COLLECTOR_10` - お気に入り10件達成
  - [ ] `COLLECTOR_50` - お気に入り50件達成
  - [ ] `SERIES_COMPLETE` - シリーズ完走
  - [ ] `REACTOR_10` - スワイプ/リアクション10回

### バッジ付与ロジック
- [ ] `lib/badge-engine.ts` 作成
  - [ ] `checkAndAwardBadges(userId)`: 各バッジの条件を確認し未取得なら付与
  - [ ] Supabase `user_badges` テーブルに INSERT
- [ ] 各アクション完了時に `checkAndAwardBadges` を呼び出す
  - [ ] ログイン後（004 認証コールバック）
  - [ ] お気に入り追加後（007 Server Action）
  - [ ] シリーズ完走マーク後（011 Server Action）

### ポイント
- [ ] Supabase `user_points` テーブル追加（user_id, points, reason, created_at）
- [ ] ポイント付与トリガーと付与量を定義
  - [ ] 毎日ログイン: +5pt
  - [ ] お気に入り追加: +1pt
  - [ ] シリーズ完走: +20pt
  - [ ] バッジ取得: +10pt
- [ ] `actions/points.ts` に `awardPoints(userId, amount, reason)` を実装

### ストリーク管理
- [ ] Supabase `login_streaks` テーブル追加（user_id, current_streak, last_login_date）
- [ ] ログイン時に連続日数を更新（前回ログインが昨日なら+1、途切れたらリセット）

### UI
- [ ] `app/mypage/page.tsx` にバッジ一覧・ポイント残高を表示
- [ ] バッジ取得時のトースト通知（`sonner` または shadcn/ui Toast）
- [ ] ストリーク日数の表示（🔥 7日連続）
- [ ] 未取得バッジはグレーアウトで表示（次の目標として機能）
