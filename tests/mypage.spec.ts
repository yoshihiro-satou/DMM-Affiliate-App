/**
 * マイページ E2E テスト
 *
 * テスト用ユーザーを /api/test/magic-link で生成し、
 * パスワードログイン後にマイページの表示・操作を検証する。
 * 各テスト後にテストユーザーを削除する。
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const HELPER_API = '/api/test/magic-link'

function uniqueEmail() {
  return `mp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.example.com`
}

async function createPasswordUser(
  req: APIRequestContext,
  email: string,
  password: string,
  displayName = 'テストユーザー'
): Promise<{ user_id: string }> {
  const res = await req.put(HELPER_API, {
    data: { email, display_name: displayName, password },
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

async function loginAs(page: Parameters<typeof test>[1] extends (args: infer A) => unknown ? A extends { page: infer P } ? P : never : never, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill(email)
  await page.getByLabel('パスワード').fill(password)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 45000 })
}

// ─── 共通セットアップ ─────────────────────────────────────────────────────────

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'age_check_done', value: '1', domain: 'localhost', path: '/' },
  ])
})

// ─── 1. 未認証アクセス ─────────────────────────────────────────────────────────

test.describe('未認証アクセス', () => {
  test('/mypage は未ログインだと /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/mypage')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

// ─── 2. UI 表示 ───────────────────────────────────────────────────────────────

test.describe('マイページ UI', () => {
  const password = 'Test1234!'
  let user_id: string
  let email: string

  test.beforeEach(async ({ request, page }) => {
    email = uniqueEmail()
    const result = await createPasswordUser(request, email, password)
    user_id = result.user_id
    await loginAs(page, email, password)
    await page.goto('/mypage')
    await expect(page).toHaveURL(/\/mypage/, { timeout: 10000 })
  })

  test.afterEach(async ({ request }) => {
    if (user_id) await deleteUser(request, user_id)
  })

  test('MY PAGE ラベルが表示される', async ({ page }) => {
    await expect(page.getByText('MY PAGE')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/mypage_01_page.png', fullPage: true })
  })

  test('display_name が表示される', async ({ page }) => {
    await expect(page.getByText('テストユーザー')).toBeVisible()
  })

  test('メールアドレスが伏せ字で表示される', async ({ page }) => {
    // mp-xxx@test.example.com → mp***@test.example.com
    await expect(page.getByText(/^mp\*\*\*@/)).toBeVisible()
  })

  test('ACTIVITY セクションが存在する', async ({ page }) => {
    const main = page.getByRole('main')
    await expect(main.getByText('ACTIVITY')).toBeVisible()
    await expect(main.getByText('いいね')).toBeVisible()
    await expect(main.getByText('スキップ')).toBeVisible()
    // 「お気に入り」はボトムナビにも存在するため first() で ACTIVITY カードを対象にする
    await expect(main.getByText('お気に入り').first()).toBeVisible()
    // 「シリーズ完走」バッジと被るため exact: true で完全一致
    await expect(main.getByText('シリーズ', { exact: true })).toBeVisible()
  })

  test('直近14日の閲覧数チャートが表示される', async ({ page }) => {
    await expect(page.getByText('直近14日の閲覧数')).toBeVisible()
  })

  test('「パスワードを変更する」リンクが /forgot-password へ遷移する', async ({ page }) => {
    await page.getByRole('link', { name: 'パスワードを変更する' }).click()
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10000 })
    await page.screenshot({ path: 'tests/screenshots/mypage_02_forgot_password.png' })
  })

  test('ログアウトボタンが存在する', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible()
  })
})

// ─── 3. ログアウト ────────────────────────────────────────────────────────────

test.describe('ログアウト', () => {
  const password = 'Test1234!'
  let user_id: string
  let email: string

  test.beforeEach(async ({ request, page }) => {
    email = uniqueEmail()
    const result = await createPasswordUser(request, email, password)
    user_id = result.user_id
    await loginAs(page, email, password)
    await page.goto('/mypage')
    await expect(page).toHaveURL(/\/mypage/, { timeout: 10000 })
  })

  test.afterEach(async ({ request }) => {
    if (user_id) await deleteUser(request, user_id)
  })

  test('ログアウト後に / へリダイレクトされる', async ({ page }) => {
    test.setTimeout(60000)
    await page.getByRole('button', { name: 'ログアウト' }).click()
    await expect(page).toHaveURL('/', { timeout: 20000 })
    await page.screenshot({ path: 'tests/screenshots/mypage_03_after_logout.png' })
  })

  test('ログアウト後に /mypage へアクセスすると /login にリダイレクトされる', async ({ page }) => {
    test.setTimeout(60000)
    await page.getByRole('button', { name: 'ログアウト' }).click()
    await expect(page).toHaveURL('/', { timeout: 20000 })
    await page.goto('/mypage')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
