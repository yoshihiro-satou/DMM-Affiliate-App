/**
 * 年齢確認画面 E2E テスト
 *
 * ミドルウェアが age_check_done Cookie のない初回ユーザーを
 * /age-check にリダイレクトする挙動と、確認後の Cookie 設定・遷移を検証する。
 */
import { test, expect } from '@playwright/test'

// このファイルのテストは Cookie なし（初回訪問状態）で実行する
// ─────────────────────────────────────────────────────────────────────────────

test.describe('年齢確認画面', () => {
  test('初回訪問でトップページが /age-check にリダイレクトされる', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/age-check/)
  })

  test('age-check ページの UI が正しく表示される', async ({ page }) => {
    await page.goto('/age-check')

    await expect(page.getByRole('heading', { name: '年齢確認' })).toBeVisible()
    await expect(page.getByText('18歳以上の方のみご利用いただけます')).toBeVisible()
    await expect(page.getByRole('button', { name: '18歳以上です・入場する' })).toBeVisible()
    await expect(page.getByRole('link', { name: '18歳未満です・退場する' })).toBeVisible()

    await page.screenshot({ path: 'tests/screenshots/age_01_page.png', fullPage: true })
  })

  test('「18歳未満」リンクが yahoo.co.jp を向いている', async ({ page }) => {
    await page.goto('/age-check')
    const link = page.getByRole('link', { name: '18歳未満です・退場する' })
    await expect(link).toHaveAttribute('href', 'https://www.yahoo.co.jp')
  })

  test('「18歳以上」ボタンを押すと Cookie が設定されてトップへ遷移する', async ({ page }) => {
    await page.goto('/age-check?from=/')
    await page.getByRole('button', { name: '18歳以上です・入場する' }).click()

    // トップページに遷移
    await expect(page).toHaveURL('/')

    // age_check_done=1 Cookie が存在する
    const cookies = await page.context().cookies()
    const ageCheckCookie = cookies.find((c) => c.name === 'age_check_done')
    expect(ageCheckCookie?.value).toBe('1')

    await page.screenshot({ path: 'tests/screenshots/age_02_after_confirm.png', fullPage: true })
  })

  test('from パラメータの遷移先に正しく戻る', async ({ page }) => {
    await page.goto('/age-check?from=/search')
    await page.getByRole('button', { name: '18歳以上です・入場する' }).click()
    await expect(page).toHaveURL('/search')
  })

  test('確認済みユーザーは /age-check にリダイレクトされない', async ({ context, page }) => {
    await context.addCookies([
      { name: 'age_check_done', value: '1', domain: 'localhost', path: '/' },
    ])
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/age-check/)
  })
})
