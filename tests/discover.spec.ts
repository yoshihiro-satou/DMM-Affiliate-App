import { test, expect } from '@playwright/test'


test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'age_check_done', value: '1', domain: 'localhost', path: '/' },
  ])
})

test.describe('Discoverページ（スワイプフィード）', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: 'tests/screenshots/01_discover_initial.png' })
  })

  test('カードレイアウト: 動画・情報・CTAが揃っている', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })
    // 動画/iframeがロードされるまで少し待つ
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/02_card_layout.png' })

    // FANZAで見るボタン
    await expect(page.getByRole('link', { name: 'FANZAで見る' }).first()).toBeVisible()
    // タイトル・動画エリア
    await expect(page.locator('h2').first()).toBeVisible()
  })

  test('右スワイプでLIKEスタンプが表示される', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })

    const card = page.locator('.absolute.inset-x-4').first()
    const box = await card.boundingBox()
    if (!box) throw new Error('カードが見つかりません')

    // 情報エリア（下75%あたり）から右スワイプ
    const cx = box.x + box.width * 0.5
    const cy = box.y + box.height * 0.75
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 130, cy, { steps: 15 })
    await page.screenshot({ path: 'tests/screenshots/03_swipe_right_like_stamp.png' })
    await page.mouse.up()
  })

  test('左スワイプでSKIPスタンプが表示される', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })

    const card = page.locator('.absolute.inset-x-4').first()
    const box = await card.boundingBox()
    if (!box) throw new Error('カードが見つかりません')

    const cx = box.x + box.width * 0.5
    const cy = box.y + box.height * 0.75
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx - 130, cy, { steps: 15 })
    await page.screenshot({ path: 'tests/screenshots/04_swipe_left_skip_stamp.png' })
    await page.mouse.up()
  })

  test('スワイプ完了で次のカードに切り替わる', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })

    const firstTitle = await page.locator('h2').first().textContent()

    const card = page.locator('.absolute.inset-x-4').first()
    const box = await card.boundingBox()
    if (!box) throw new Error('カードが見つかりません')

    const cx = box.x + box.width * 0.5
    const cy = box.y + box.height * 0.75
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 220, cy, { steps: 20 })
    await page.mouse.up()

    // アニメーション完了を待つ
    await page.waitForTimeout(700)
    await page.screenshot({ path: 'tests/screenshots/05_after_swipe_next_card.png' })

    const nextTitle = await page.locator('h2').first().textContent()
    expect(nextTitle).not.toBe(firstTitle)
  })

  test('FANZAで見るボタンが正しいURLを持つ', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })

    const cta = page.getByRole('link', { name: 'FANZAで見る' }).first()
    const href = await cta.getAttribute('href')
    expect(href).toContain('dmm.co.jp')
    await page.screenshot({ path: 'tests/screenshots/06_cta_button.png' })
  })

  test('ボトムナビゲーションが表示される', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: 'tests/screenshots/07_bottom_nav.png' })

    const nav = page.locator('nav, [role="navigation"]').first()
    await expect(nav).toBeVisible()
  })
})
