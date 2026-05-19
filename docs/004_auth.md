# 004 認証フロー（パスワード認証・新規登録・パスワードリセット）

## 概要

メールアドレス + パスワードによる認証。マジックリンクは廃止。
新規登録は `/register` ページで行い、登録と同時にログイン・トップページへ遷移する。
パスワードを忘れた場合は `/forgot-password` からリセットメールを送信できる。

ゲストの LocalStorage データはログイン後に Supabase へ移行する。

## 依存
- 001 Supabase 初期設定

---

## 実装済みファイル構成

```
app/
├── login/
│   ├── page.tsx                        # ログインページ（メール + パスワード）
│   ├── actions.ts                      # signIn（password必須）/ migrateGuestData
│   ├── sent/page.tsx                   # /login にリダイレクト（廃止ページ）
│   └── _components/login-form.tsx
├── register/
│   ├── page.tsx                        # 新規登録ページ
│   ├── actions.ts                      # signUp（admin API）
│   └── _components/register-form.tsx
├── forgot-password/
│   ├── page.tsx                        # パスワードリセット申請ページ
│   ├── actions.ts                      # resetPassword
│   ├── sent/page.tsx                   # 「メールを確認してください」ページ
│   └── _components/forgot-form.tsx
├── update-password/
│   ├── page.tsx                        # 新パスワード設定ページ
│   ├── actions.ts                      # updatePassword
│   └── _components/update-form.tsx
└── auth/
    └── confirm/route.ts                # verifyOtp → type別にリダイレクト
```

---

## フロー

### ログイン
```
/login → メール + パスワード入力 → signInWithPassword → /
```

### 新規登録
```
/register → ニックネーム + メール + パスワード入力 →
admin.auth.admin.createUser({ email_confirm: true }) →  // 確認メールなし
signInWithPassword →
updateLoginStreak + checkAndAwardBadges →
/
```

### パスワードリセット
```
/login → 「パスワードを忘れた方はこちら」→
/forgot-password → メール入力 →
resetPasswordForEmail →
/forgot-password/sent →
メールのリンク → /auth/confirm?token_hash=...&type=recovery →
/update-password → 新パスワード入力 →
updateUser({ password }) →
/login?updated=1
```

### メール確認（新規登録は不要、OTP テスト用のみ）
```
/auth/confirm?token_hash=...&type=email →
verifyOtp → updateLoginStreak + checkAndAwardBadges → /
```

---

## 主要実装

### `app/login/actions.ts`

```ts
export async function signIn(_prev, formData): Promise<{ error: string }> {
  const email = formData.get('email')?.trim()
  const password = formData.get('password') ?? ''
  if (!email || !password) return { error: 'メールアドレスとパスワードを入力してください' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.message.includes('Invalid login credentials'))
      return { error: 'メールアドレスまたはパスワードが正しくありません' }
    if (error.message.includes('Email not confirmed'))
      return { error: 'メールアドレスが確認されていません。登録メールのリンクをタップしてください' }
    return { error: error.message }
  }
  redirect('/')
}

// ゲストデータ移行（favorites / swipe_history → Supabase）
export async function migrateGuestData(data) { ... }
```

### `app/register/actions.ts`

`supabase.auth.signUp` ではなく **admin API** を使用。
`email_confirm: true` でメール確認なしに確認済みユーザーを作成する。
Supabase 無料プランのメール送信上限（3通/時）を回避できる。

```ts
export async function signUp(_prev, formData): Promise<{ error: string }> {
  // バリデーション: 全項目必須 / パスワード8文字以上 / 確認一致
  ...

  const admin = createAdminClient()
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,       // 確認メールを送らない
    user_metadata: { display_name },
  })
  if (createError) return { error: ... }

  // profiles テーブルに display_name を保存
  // on_auth_user_created トリガーは id/email のみ INSERT するため、upsert で display_name を補完
  if (data.user) {
    await admin.from('profiles').upsert({ id: data.user.id, email, display_name })
  }

  // セッション確立
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email, password })

  // 初回ログインとしてストリーク・バッジを付与
  await Promise.all([
    updateLoginStreak(data.user.id),
    checkAndAwardBadges(data.user.id, 'login'),
  ])

  redirect('/')
}
```

### `app/auth/confirm/route.ts`

`type=recovery`（パスワードリセット）のとき `/update-password` へ分岐。
ストリーク更新は行わない。

```ts
if (!error) {
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/update-password', request.url))
  }
  // email / signup → ストリーク更新 → /
  await updateLoginStreak(user.id)
  await checkAndAwardBadges(user.id, 'login')
  redirect('/')
}
```

### `app/forgot-password/actions.ts`

登録済みかどうかを外部に漏らさないため、エラーは無視して常に `sent` へ遷移。

```ts
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${protocol}://${host}/auth/confirm`,
})
redirect('/forgot-password/sent')
```

### `app/update-password/actions.ts`

```ts
const { error } = await supabase.auth.updateUser({ password })
if (error) return { error: error.message }
redirect('/login?updated=1')
```

---

## ログインページ UI

フィールド: **メールアドレス + パスワード**（ニックネームは不要）

- ボタン: 常時「ログイン」（pending 中は「ログイン中...」）
- リンク: 「パスワードを忘れた方はこちら」→ `/forgot-password`
- リンク: 「はじめての方は新規登録 →」→ `/register`

成功メッセージ（query param）:
- `?registered=1` → 「アカウントを作成しました...」（将来用に残存）
- `?updated=1` → 「パスワードを更新しました...」

---

## ゲスト→ログイン移行

- `migrateGuestData` Server Action（`app/login/actions.ts`）
- `components/auth-listener.tsx` で `SIGNED_IN` イベントを検知 → 移行処理を呼び出し
- LocalStorage の `guest_favorites`（最大5件）→ `favorites` テーブルへ UPSERT
- LocalStorage の `guest_swipe_history` → `swipe_history` テーブルへ UPSERT
- 移行完了後に LocalStorage をクリア

---

## TODO

### ログイン促進 UI（ゲートではなく誘導）
- [ ] お気に入りが6件目になったとき → ボトムシートで登録を促す（007_favorites で実装）
- [ ] スワイプを10枚こなしたとき → 「好みを保存しませんか？」バナー表示（009_swipe-feed で実装）
- [ ] 通知ベルをタップしたとき → ログインを求めるモーダル表示（014_pwa-push で実装）

### マイページ・ログアウト
- [x] `app/mypage/page.tsx` 作成（ユーザー名・ポイント表示）
- [x] `app/mypage/actions.ts` に `signOut()` Server Action 追加
- [x] ログアウト後は `/` へリダイレクト

### Playwright テスト（`tests/login.spec.ts` / `tests/register.spec.ts`）
- [x] ログインページ UI 確認（メール・パスワードフィールド、各リンク）
- [x] フォームバリデーション（空欄・無効メール形式）
- [x] パスワード認証フロー（正常・誤パスワード・cookie確認）
- [x] OTP トークン検証フロー（login_streaks / WELCOME バッジ確認）
- [x] 新規登録フロー（バリデーション・正常登録→トップページ遷移）
- [x] エラーハンドリング（無効トークン・`?updated=1` メッセージ）

---

## 備考

- **マジックリンク廃止**: Supabase 無料プランのメール送信上限（3通/時）を回避するため廃止
- **admin API で登録**: `supabase.auth.signUp` の代わりに `admin.auth.admin.createUser({ email_confirm: true })` を使用。`SUPABASE_SERVICE_ROLE_KEY` が必要（サーバー専用、公開禁止）
- **`/login/sent`**: マジックリンク廃止により `/login` へのリダイレクトのみ
- **`on_auth_user_created` トリガー**: admin API でユーザーを作成した場合も `auth.users` への INSERT は発生するため、`profiles` テーブルへの自動作成トリガーは正常に動作する
