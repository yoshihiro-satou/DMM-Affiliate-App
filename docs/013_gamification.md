# 013 ゲーミフィケーション・バッジ・ポイント

## 概要
金銭換算なしの独自ポイント・バッジ。資金決済法の対象外。毎日ログイン・お気に入り・シリーズ完走などのアクションでバッジを付与し、リテンションを高める。

## 依存
- 001 Supabase 初期設定
- 004 認証
- 007 お気に入り

## 実装済み（2026-05-15）

### バッジ定義
- [x] `lib/badges.ts` にバッジ一覧を定義
  - [x] `WELCOME` - 初回ログイン
  - [x] `STREAK_3` / `STREAK_7` / `STREAK_30` - 連続ログイン3日/7日/30日
  - [x] `COLLECTOR_10` - お気に入り10件達成
  - [x] `COLLECTOR_50` - お気に入り50件達成
  - [x] `SERIES_COMPLETE` - シリーズ完走
  - [x] `REACTOR_10` - スワイプ/リアクション10回

### バッジ付与ロジック
- [x] `lib/badge-engine.ts` 作成
  - [x] `checkAndAwardBadges(userId, trigger)`: 各バッジの条件を確認し未取得なら付与
  - [x] Supabase `user_badges` テーブルに INSERT
  - [x] サービスロールキーで RLS バイパス（`lib/supabase/admin.ts`）
- [x] 各アクション完了時に `checkAndAwardBadges` を呼び出す
  - [x] ログイン後（`app/auth/confirm/route.ts`）→ ストリーク更新後にチェック
  - [x] お気に入り追加後（`actions/favorites.ts`）→ COLLECTOR_10/50 をチェック
  - [x] スワイプ記録後（`actions/swipe.ts`）→ REACTOR_10 をチェック
  - [x] シリーズ読了マーク後（`actions/series.ts`）→ totalCount 一致時に SERIES_COMPLETE をチェック

### ポイント（未公開・接続停止中）
> **現状**: スキーマ・関数はDBに存在するが、付与ロジックは無効化しておりUIにも表示しない。
> 公開時は `lib/badge-engine.ts` のコメント1行を外すだけで再接続できる。

- [x] Supabase `user_points` テーブル作成済み（user_id, amount, reason, created_at）
- [x] `increment_user_points(p_user_id, p_amount)` DB関数作成済み（`profiles.points` をアトミックに加算）
- [ ] バッジ取得時の自動付与 ← `badge-engine.ts` 内でコメントアウト中
- [ ] マイページのポイント残高表示 ← セクションごと非表示
- [ ] バッジトーストの `+Xpt` 表示 ← 非表示

### ストリーク管理
- [x] Supabase `login_streaks` テーブル追加（user_id, current_streak, last_login_date, updated_at）
- [x] `lib/login-streak.ts` の `updateLoginStreak(userId)` でログイン時に連続日数を更新
  - [x] 前回ログインが昨日 → +1
  - [x] 前回ログインが今日 → 変更なし
  - [x] それ以前 → 1 にリセット

### UI
- [x] `app/mypage/page.tsx` にストリーク表示を追加
  - [x] ストリーク表示（🔥 X日連続）
  - ~~[x] バッジグリッド・取得バッジ数表示~~ → 2026-05-20 マイページから削除
  - ~~[x] 24時間以内に取得したバッジに「NEW」ピル表示~~ → 同上
  - [ ] ポイント残高表示 ← 未公開のため非表示
- [x] バッジ取得時のトースト通知（`components/ui/BadgeToast.tsx`）は引き続き有効
  - [x] `motion` による slide-in/out アニメーション
  - [x] 3秒後に自動消去
  - [x] お気に入りボタン（`FavoriteButton`）・読了ボタン（`ReadToggleButton`）・スワイプフィード（`SwipeFeed`）に統合

## ファイル構成

```
lib/badges.ts                           ← 新規（バッジ定義）
lib/badge-engine.ts                     ← 新規（付与ロジック）
lib/login-streak.ts                     ← 新規（ストリーク更新）
lib/supabase/admin.ts                   ← 新規（サービスロールクライアント）
components/ui/BadgeToast.tsx            ← 新規（トースト UI）
actions/favorites.ts                    ← newBadges 返却追加
actions/swipe.ts                        ← newBadges 返却追加
actions/series.ts                       ← totalCount パラメータ追加 + newBadges 返却
app/auth/confirm/route.ts               ← ストリーク更新 + バッジチェック追加
app/mypage/page.tsx                     ← StreakSection のみ（BadgesSection は削除）
components/product/FavoriteButton.tsx   ← BadgeToast 統合
app/series/[id]/_components/ReadToggleButton.tsx ← totalCount + BadgeToast 統合
app/series/[id]/page.tsx                ← totalCount を ReadToggleButton に渡す
components/swipe/SwipeFeed.tsx          ← BadgeToast 統合
types/supabase.ts                       ← user_points, login_streaks 追加
```

## アーキテクチャ補足

### サービスロールクライアント
`lib/supabase/admin.ts` でサービスロールキーを使った Supabase クライアントを生成。
`badge-engine.ts` と `login-streak.ts` はこのクライアントを使い、RLS をバイパスしてバッジ付与・ポイント記録を行う。
認証コールバック（`auth/confirm`）でセッション確立直後でも確実に動作するため。

### バッジトリガー設計
| trigger | 呼び出し元 | チェック対象バッジ |
|---------|------------|-------------------|
| `login` | auth/confirm | WELCOME, STREAK_3/7/30 |
| `favorite` | addFavorite | COLLECTOR_10/50 |
| `swipe` | recordSwipe | REACTOR_10 |
| `series_complete` | markAsRead (完走時のみ) | SERIES_COMPLETE |

### Server Action の戻り値変更
`addFavorite`・`recordSwipe`・`markAsRead` が `{ newBadges: BadgeType[] }` を返すよう変更。
クライアント側の `startTransition(async () => { const result = await action(); ... })` パターンで受け取り、トーストを表示。

## 制限・既知の挙動
- バッジ付与は非重複（同じバッジは2回付与されない）
- STREAK バッジは連続日数が下がっても取り消されない（一度取得したら永続）
- バッジトーストは複数バッジ同時取得に対応（縦にスタック表示）
- ログイン時バッジ（WELCOME・STREAK）はトースト通知なし。マイページで「NEW」ピルで確認

## ポイント機能の再公開手順
1. `lib/badge-engine.ts` のコメント `// ポイント付与は未公開のため一時停止` を外し、以下を復元する:
   ```ts
   const totalPoints = toAward.reduce((sum, b) => sum + BADGE_DEFS[b].points, 0)
   await Promise.all([
     supabase.from('user_points').insert(
       toAward.map((b) => ({ user_id: userId, amount: BADGE_DEFS[b].points, reason: `badge:${b}` }))
     ),
     supabase.rpc('increment_user_points', { p_user_id: userId, p_amount: totalPoints }),
   ])
   ```
2. `components/ui/BadgeToast.tsx` にポイント表示を追加（`+{def.points}pt`）
3. `app/mypage/page.tsx` の `profiles` クエリに `points` を追加し、ポイント残高セクションを復元する
