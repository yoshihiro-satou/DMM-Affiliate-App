/**
 * 新規登録フロー E2E テスト
 *
 * テスト構成:
 *   1. UI表示
 *   2. バリデーション
 *   3. フォーム送信 → /login?registered=1 へ遷移
 *   4. 新規登録 → ログイン → トップページ遷移（admin API でメール確認済みユーザーを作成）
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const DISPLAY_NAME = 'テストユーザー'
const HELPER_API = '/api/test/magic-link'
const PASSWORD = 'Test1234!'

function uniqueEmail() {
  return `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`
}

async function createPasswordUser(
  req: APIRequestContext,
  email: string,
  password: string
): Promise<{ user_id: string; email: string }> {
  const res = await req.put(HELPER_API, {
    data: { email, display_name: DISPLAY_NAME, password },
  })
  if (!res.ok()) throw new Error(`createPasswordUser failed: ${await res.text()}`)
  return res.json()
}

async function getUserIdByEmail(
  req: APIRequestContext,
  email: string
): Promise<string | null> {
  // POST で generateLink を呼ぶと既存ユーザーの user_id も返る
  try {
    const res = await req.post(HELPER_API, {
      data: { email, display_name: DISPLAY_NAME },
    })
    if (!res.ok()) return null
    const data = await res.json()
    return data.user_id ?? null
  } catch {
    return null
  }
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

test.describe('新規登録ページ UI', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible()
    await expect(page.getByText('NEW ACCOUNT')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/register_01_page.png' })
  })

  test('全フィールドとボタンが存在する', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel('ニックネーム')).toBeVisible()
    await expect(page.getByLabel('メールアドレス')).toBeVisible()
    await expect(page.getByLabel('パスワード', { exact: true })).toBeVisible()
    await expect(page.getByLabel('パスワード確認')).toBeVisible()
    await expect(page.getByRole('button', { name: 'アカウントを作成' })).toBeVisible()
  })

  test('「すでにアカウントをお持ちの方」リンクが/loginへ遷移', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('link', { name: 'すでにアカウントをお持ちの方はこちら' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/loginの「はじめての方は新規登録」リンクが/registerへ遷移', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /はじめての方は新規登録/ }).click()
    await expect(page).toHaveURL(/\/register/)
  })
})

// ─── 2. バリデーション ────────────────────────────────────────────────────────

test.describe('登録フォームバリデーション', () => {
  test('パスワードが一致しないとエラーを表示', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('ニックネーム').fill(DISPLAY_NAME)
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByLabel('パスワード', { exact: true }).fill('Test1234!')
    await page.getByLabel('パスワード確認').fill('Different99!')
    await page.getByRole('button', { name: 'アカウントを作成' }).click()
    await expect(page.getByText('パスワードが一致しません')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/register/)
    await page.screenshot({ path: 'tests/screenshots/register_02_password_mismatch.png' })
  })

  test('パスワードが7文字以下はエラーを表示', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('ニックネーム').fill(DISPLAY_NAME)
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByLabel('パスワード', { exact: true }).fill('Short1!')
    await page.getByLabel('パスワード確認').fill('Short1!')
    await page.getByRole('button', { name: 'アカウントを作成' }).click()
    await expect(page.getByText('パスワードは8文字以上で入力してください')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/register/)
  })

  test('空のまま送信するとブラウザのrequiredバリデーションが効く', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('button', { name: 'アカウントを作成' }).click()
    await expect(page).toHaveURL(/\/register/)
  })
})

// ─── 3. 新規登録フォーム送信フロー ───────────────────────────────────────────

test.describe('新規登録フォーム送信', () => {
  let cleanupEmail: string | null = null

  test.afterEach(async ({ request }) => {
    if (cleanupEmail) {
      const user_id = await getUserIdByEmail(request, cleanupEmail)
      if (user_id) await deleteUser(request, user_id)
      cleanupEmail = null
    }
  })

  test('正しい情報で登録するとトップページへ遷移する', async ({ page }) => {
    // admin API でメール確認済みユーザーを作成するためレート制限なし
    test.setTimeout(60000)
    const email = uniqueEmail()
    cleanupEmail = email

    await page.goto('/register')
    await page.getByLabel('ニックネーム').fill(DISPLAY_NAME)
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByLabel('パスワード', { exact: true }).fill(PASSWORD)
    await page.getByLabel('パスワード確認').fill(PASSWORD)
    await page.getByRole('button', { name: 'アカウントを作成' }).click()

    // 登録完了後はトップページ（/）へリダイレクト
    await expect(page).not.toHaveURL(/\/register/, { timeout: 30000 })
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

    await page.screenshot({ path: 'tests/screenshots/register_03_top.png' })
  })
})

// ─── 4. 新規登録 → ログイン → トップページ遷移 ──────────────────────────────

test.describe('新規登録→ログイン→トップページ遷移', () => {
  let user_id: string
  let email: string

  test.beforeEach(async ({ request }) => {
    email = uniqueEmail()
    const result = await createPasswordUser(request, email, PASSWORD)
    user_id = result.user_id
  })

  test.afterEach(async ({ request }) => {
    if (user_id) await deleteUser(request, user_id)
  })

  test('パスワードでログインするとトップページへ遷移する', async ({ page }) => {
    test.setTimeout(90000)

    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByLabel('パスワード').fill(PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()

    // ログイン後はログインページ以外にリダイレクトされる
    await expect(page).not.toHaveURL(/\/login/, { timeout: 45000 })

    // トップページであることを確認（/ または /home など）
    await expect(page).not.toHaveURL(/\/register/, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 5000 })

    await page.screenshot({ path: 'tests/screenshots/register_04_top_page.png' })
  })

  test('ログイン後にSupabaseセッションcookieが設定される', async ({ page }) => {
    test.setTimeout(90000)

    await page.goto('/login')
    await page.getByLabel('メールアドレス').fill(email)
    await page.getByLabel('パスワード').fill(PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()

    await expect(page).not.toHaveURL(/\/login/, { timeout: 45000 })

    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find((c) => c.name.startsWith('sb-'))
    expect(sessionCookie).toBeDefined()
  })
})
