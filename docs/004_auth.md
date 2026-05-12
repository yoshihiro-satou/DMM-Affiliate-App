# 004 認証フロー（マジックリンク・ゲスト→ログイン移行）

## 概要
名前＋メールアドレスのマジックリンク認証。パスワードなし。ゲストの LocalStorage データをログイン後に Supabase へ移行する。

## 依存
- 001 Supabase 初期設定

## TODO

### ログインページ
- [ ] `app/login/page.tsx` 作成（名前・メールアドレス入力フォーム）
- [ ] `app/login/actions.ts` 作成
  - [ ] `signIn(formData)`: `supabase.auth.signInWithOtp({ email, options: { data: { display_name } } })`
  - [ ] 送信後「メールを確認してください」画面へ遷移
- [ ] `app/auth/confirm/route.ts` 作成（マジックリンクの `token_hash` をセッションに交換）

### ゲスト→ログイン移行
- [ ] `lib/guest-migration.ts` 作成
  - [ ] LocalStorage の `guest_favorites`（最大5件）を `favorites` テーブルへ INSERT
  - [ ] LocalStorage の `guest_swipe_history` を `swipe_history` テーブルへ INSERT
  - [ ] 移行完了後に LocalStorage をクリア
- [ ] ログイン完了コールバック（`app/auth/confirm/route.ts`）で移行処理を呼び出し

### ログイン促進 UI（ゲートではなく誘導）
- [ ] お気に入りが6件目になったとき → ボトムシートで登録を促す
- [ ] スワイプを10枚こなしたとき → 「好みを保存しませんか？」バナー表示
- [ ] 通知ベルをタップしたとき → ログインを求めるモーダル表示

### マイページ・ログアウト
- [ ] `app/mypage/page.tsx` 作成（ユーザー名・バッジ・ポイント表示）
- [ ] `app/mypage/actions.ts` に `signOut()` Server Action 追加
- [ ] ログアウト後は `/` へリダイレクト

### テスト
- [ ] マジックリンクメールが届くことを確認
- [ ] リンクをクリックしてログイン完了 → マイページに遷移することを確認
- [ ] ゲストお気に入り → ログイン後に Supabase に移行されていることを確認
