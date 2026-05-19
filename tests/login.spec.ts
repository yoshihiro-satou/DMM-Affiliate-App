/**
 * ログイン画面 E2E テスト
 *
 * 認証フロー（パスワード必須、マジックリンク廃止）:
 *   /login → メール + パスワード → signInWithPassword → /
 *
 * OTP 確認フロー（新規登録のメール確認）:
 *   /auth/confirm?token_hash=…&type=email → verifyOtp → /
 *
 * テスト用ユーザーは /api/test/magic-link で生成し
 * メール送信なしにトークンを取得する。各テスト後にテストユーザーを削除。
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const HELPER_API = '/api/test/magic-link'

function uniqueEmail() {
  return `pw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`
}

// ─── テスト用ヘルパー ─────────────────────────────────────────────────────────

async function generateToken(
  req: APIRequestContext,
  email: string
): Promise<{ token_hash: string; user_id: string }> {
  const res = await req.post(HELPER_API, {
    data: { email, display_name: 'テストユーザー' },
  })
  if (!res.ok()) throw new Error(`generateToken failed: ${await res.text()}`)
  return res.json()
}

async function getDbState(req: APIRequestContext, user_id: string) {
  const fetch = async () => {
    const res = await req.get(`${HELPER_API}?user_id=${user_id}`)
    if (!res.ok()) throw new Error(`getDbState failed: ${await res.text()}`)
    return res.json() as Promise<{
      login_streak: number | null
      last_login_date: string | null
      badges: string[]
    }>
  }
  try {
    return await fetch()
  } catch {
    await new Promise((r) => setTimeout(r, 2000))
    return await fetch()
  }
}

async function createPasswordUser(
  req: APIRequestContext,
  email: string,
  password: string
): Promise<{ user_id: string; email: string }> {
  const res = await req.put(HELPER_API, {
    data: { email, display_name: 'テストユーザー', password },
  })
  if (!res.ok()) throw new Error(`createPasswordUser failed: ${await res.text()}`)
  return res.json()
}

async function deleteUser(req: APIRequestContext, user_id: string) {
  try {
    await req.delete(HELPER_API, { data: { user_id } })
  } catch {
    // afterEach のクリーンアップ失敗はテスト結果に影響させない
  }
}

// ─── 共通セットアップ ─────────────────────────────────────────────────────────

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'age_check_done', value: '1', domain: 'localhost', path: '/' },
  ])
})

// ─── 1. UI 表示 ───────────────────────────────────────────────────────────────

test.describe('ログインページ UI', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
    await expect(page.getByText('MEMBER LOGIN')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/login_01_page.png' })
  })

  test('メール・パスワード・ログインボタンが存在する', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('メールアドレス')).toBeVisible()
    await expect(page.getByLabel('パスワード')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
  })

  test('フィールドに入力できる', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByLabel('パスワード').fill('Test1234!')
    await expect(page.getByLabel('メールアドレス')).toHaveValue('test@example.com')
    await expect(page.getByLabel('パスワード')).toHaveValue('Test1234!')
  })

  test('「パスワードを忘れた方」リンクが/forgot-passwordへ遷移', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'パスワードを忘れた方はこちら' }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('「はじめての方は新規登録」リンクが/registerへ遷移', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /はじめての方は新規登録/ }).click()
    await expect(page).toHaveURL(/\/register/)
  })
})

// ─── 2. バリデーション ────────────────────────────────────────────────────────

test.describe('フォームバリデーション', () => {
  test('空のまま送信するとブラウザのrequiredバリデーションが効く', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page).not.toHaveURL(/\/login\/sent/)
  })

  test('メールのみ入力してもパスワードrequiredで阻止される', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('無効なメール形式はブラウザのtype=emailバリデーションで阻止', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill('not-an-email')
    await page.getByLabel('パスワード').fill('Test1234!')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})

// ─── 3. OTP トークン検証フロー（実 DB） ──────────────────────────────────────

test.describe('OTPトークン検証フロー', () => {
  let user_id: string
  let token_hash: string
  const email = uniqueEmail()

  test.beforeEach(async ({ request }) => {
    const result = await generateToken(request, email)
    user_id = result.user_id
    token_hash = result.token_hash
  })

  test.afterEach(async ({ request }) => {
    if (user_id) await deleteUser(request, user_id)
  })

  test('有効なトークンで認証すると / にリダイレクトされる', async ({ page }) => {
    test.setTimeout(120000)

    await page.goto(`/auth/confirm?token_hash=${token_hash}&type=email`)

    await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
    await page.screenshot({ path: 'tests/screenshots/login_04_confirm_redirect.png' })
  })

  test('認証後にSupabaseセッションcookieが設定される', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto(`/auth/confirm?token_hash=${token_hash}&type=email`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 })

    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.startsWith('sb-'))
    expect(sessionCookie).toBeDefined()
  })

  test('認証後に login_streaks レコードがDBに作成される', async ({ page, request }) => {
    test.setTimeout(120000)
    await page.goto(`/auth/confirm?token_hash=${token_hash}&type=email`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 60000 })

    const db = await getDbState(request, user_id)
    expect(db.login_streak).toBe(1)
    expect(db.last_login_date).toBe(new Date().toISOString().slice(0, 10))
  })

  test('初回ログインで WELCOME バッジがDBに付与される', async ({ page, request }) => {
    test.setTimeout(120000)
    await page.goto(`/auth/confirm?token_hash=${token_hash}&type=email`)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 60000 })

    const db = await getDbState(request, user_id)
    expect(db.badges).toContain('WELCOME')
  })
})

// ─── 4. パスワード認証フロー ──────────────────────────────────────────────────

test.describe('パスワード認証フロー', () => {
  let user_id: string
  let email: string
  const password = 'Test1234!'

  test.beforeEach(async ({ request }) => {
    email = uniqueEmail()
    const result = await createPasswordUser(request, email, password)
    user_id = result.user_id
  })

  test.afterEach(async ({ request }) => {
    if (user_id) await deleteUser(request, user_id)
  })

  test('パスワード入力で即時ログインしトップページへ遷移', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByLabel('パスワード').fill(password)
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 45000 })
    await page.screenshot({ path: 'tests/screenshots/login_08_password_login.png' })
  })

  test('ログイン後にSupabaseセッションcookieが設定される（パスワード認証）', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByLabel('パスワード').fill(password)
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 45000 })

    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.startsWith('sb-'))
    expect(sessionCookie).toBeDefined()
  })

  test('誤ったパスワードはエラーメッセージを表示', async ({ page }) => {
    test.setTimeout(90000)
    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByLabel('パスワード').fill('WrongPass999!')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(
      page.getByText('メールアドレスまたはパスワードが正しくありません')
    ).toBeVisible({ timeout: 45000 })
    await expect(page).toHaveURL(/\/login$/)
    await page.screenshot({ path: 'tests/screenshots/login_09_wrong_password.png' })
  })
})

// ─── 5. エラーハンドリング ─────────────────────────────────────────────────────

test.describe('エラーハンドリング', () => {
  test('無効なトークンで /auth/confirm → /login?error=invalid_link にリダイレクト', async ({
    page,
  }) => {
    await page.goto('/auth/confirm?token_hash=invalid_token_xyz&type=email')
    await expect(page).toHaveURL(/\/login\?error=invalid_link/, { timeout: 10000 })
    await page.screenshot({ path: 'tests/screenshots/login_05_invalid_token.png' })
  })

  test('/login?error=invalid_link でエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/login?error=invalid_link')
    await expect(
      page.getByText('リンクが無効または期限切れです。再度お試しください。')
    ).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/login_06_error_message.png' })
  })

  test('token_hash なしで /auth/confirm → /login?error=invalid_link', async ({ page }) => {
    await page.goto('/auth/confirm?type=email')
    await expect(page).toHaveURL(/\/login\?error=invalid_link/, { timeout: 10000 })
  })

  test('/login?updated=1 でパスワード更新成功メッセージが表示される', async ({ page }) => {
    await page.goto('/login?updated=1')
    await expect(
      page.getByText('パスワードを更新しました。新しいパスワードでログインしてください。')
    ).toBeVisible()
  })
})
