# 004 認証フロー（マジックリンク・ゲスト→ログイン移行）

## 概要
名前＋メールアドレスのマジックリンク認証。パスワードなし。ゲストの LocalStorage データをログイン後に Supabase へ移行する。

## 依存
- 001 Supabase 初期設定

## TODO

### ログインページ
- [x] `app/login/page.tsx` 作成（名前・メールアドレス入力フォーム）
- [x] `app/login/actions.ts` 作成
  - [x] `signIn(formData)`: `supabase.auth.signInWithOtp({ email, options: { data: { display_name } } })`
  - [x] 送信後「メールを確認してください」画面へ遷移（`app/login/sent/page.tsx`）
- [x] `app/auth/confirm/route.ts` 作成（マジックリンクの `token_hash` をセッションに交換）

### ゲスト→ログイン移行
- [x] `lib/guest-migration.ts` 作成
  - [x] LocalStorage の `guest_favorites`（最大5件）を `favorites` テーブルへ INSERT
  - [x] LocalStorage の `guest_swipe_history` を `swipe_history` テーブルへ INSERT
  - [x] 移行完了後に LocalStorage をクリア
- [x] ログイン完了コールバック（`components/auth-listener.tsx`）で `SIGNED_IN` イベント検知→移行処理を呼び出し

### ログイン促進 UI（ゲートではなく誘導）
- [ ] お気に入りが6件目になったとき → ボトムシートで登録を促す（007_favorites で実装）
- [ ] スワイプを10枚こなしたとき → 「好みを保存しませんか？」バナー表示（009_swipe-feed で実装）
- [ ] 通知ベルをタップしたとき → ログインを求めるモーダル表示（014_pwa-push で実装）

### マイページ・ログアウト
- [x] `app/mypage/page.tsx` 作成（ユーザー名・ポイント表示、バッジは013_gamification で追加）
- [x] `app/mypage/actions.ts` に `signOut()` Server Action 追加
- [x] ログアウト後は `/` へリダイレクト

### テスト
- [ ] マジックリンクメールが届くことを確認
- [ ] リンクをクリックしてログイン完了 → マイページに遷移することを確認
- [ ] ゲストお気に入り → ログイン後に Supabase に移行されていることを確認
