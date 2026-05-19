import { test, expect } from '@playwright/test'
import { SORT_OPTIONS } from '@/components/search/searchParsers'

const KEYWORD = '水卜さくら'
const ENCODED_KEYWORD = encodeURIComponent(KEYWORD)
const SS = (name: string) => `tests/screenshots/search_${name}.png`

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'age_check_done', value: '1', domain: 'localhost', path: '/' },
  ])
})

test.describe('検索ページ基本表示', () => {
  test('キーワード検索で結果グリッドが表示される', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)

    // 件数ラベルが出るまで待つ（APIレスポンス完了の目印）
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    // 1件以上の結果カードが表示されている
    const cards = page.locator('a[href*="dmm"]')
    await expect(cards.first()).toBeVisible()

    await page.screenshot({ path: SS('01_results') })
  })

  test('ソートボタンが5種類すべて表示される', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    for (const { label } of SORT_OPTIONS) {
      await expect(page.getByRole('button', { name: label })).toBeVisible()
    }

    await page.screenshot({ path: SS('02_sort_buttons') })
  })

  test('デフォルトは「人気順」がアクティブ', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    // sort パラメータなし = rank がアクティブ
    const rankBtn = page.getByRole('button', { name: '人気順' })
    // アクティブ状態は bg-red-600/20 クラスで判定
    await expect(rankBtn).toHaveClass(/bg-red-600/)
  })
})

test.describe('ソートフィルター切り替え', () => {
  // 各ソートオプションをループでテスト
  for (const { value, label } of SORT_OPTIONS) {
    test(`「${label}」ボタンをクリックするとURLとアクティブ状態が変わる`, async ({ page }) => {
      // 別ソートを初期値にしておき切り替えを確認
      const initialSort = value === 'rank' ? 'date' : 'rank'
      await page.goto(`/search?q=${ENCODED_KEYWORD}&sort=${initialSort}`)
      await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

      // ソートボタンをクリック
      await page.getByRole('button', { name: label }).click()

      // URLの確認: nuqs はデフォルト値（rank）をURLから省略するため分岐
      if (value === 'rank') {
        // rank はデフォルトなので sort パラメータ自体が消える
        await expect(page).not.toHaveURL(/sort=/, { timeout: 5000 })
      } else {
        await expect(page).toHaveURL(new RegExp(`sort=${encodeURIComponent(value)}`), {
          timeout: 5000,
        })
      }

      // クリックしたボタンがアクティブになる（赤いスタイル）
      await expect(page.getByRole('button', { name: label })).toHaveClass(/bg-red-600/, {
        timeout: 5000,
      })

      // 結果グリッドがまだ表示されている（エラー表示になっていない）
      await expect(page.locator('a[href*="dmm"]').first()).toBeVisible({ timeout: 20000 })

      await page.screenshot({ path: SS(`03_sort_${value.replace('-', 'minus')}`) })
    })
  }
})

test.describe('アフィリエイトリンク検証', () => {
  test('全結果カードにアフィリエイトURLが設定されている', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    // グリッド内の全リンクを取得（最大20件）
    const cards = page.locator('.grid a[href*="dmm"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // 全カードのhrefを検証
    for (let i = 0; i < count; i++) {
      const href = await cards.nth(i).getAttribute('href')
      expect(href).not.toBeNull()
      expect(href).toContain('dmm.co.jp')
    }

    await page.screenshot({ path: SS('04_affiliate_links') })
  })

  test('アフィリエイトIDが埋め込まれている', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    // 先頭カードのhrefでアフィリエイトIDを確認
    const firstCard = page.locator('.grid a[href*="dmm"]').first()
    const href = await firstCard.getAttribute('href')
    expect(href).not.toBeNull()

    // DMM アフィリエイトURL形式: al.dmm.co.jp または direct link に af_id が含まれる
    // yoshihirock-990 〜 yoshihirock-999 のいずれかが含まれる
    const hasAffiliateId = /yoshihirock-99\d/.test(href ?? '')
    const isAffiliateUrl = (href ?? '').includes('al.dmm.co.jp') || hasAffiliateId

    expect(isAffiliateUrl).toBe(true)

    await page.screenshot({ path: SS('05_affiliate_id') })
  })

  test('リンクが新しいタブで開く設定になっている', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    const firstCard = page.locator('.grid a[href*="dmm"]').first()
    await expect(firstCard).toHaveAttribute('target', '_blank')
    await expect(firstCard).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('PRバッジが各カードに表示されている（景表法対応）', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    // PR バッジの存在確認
    const prBadges = page.getByText('PR')
    const count = await prBadges.count()
    expect(count).toBeGreaterThan(0)

    await page.screenshot({ path: SS('06_pr_badge') })
  })
})

test.describe('検索入力フォーム', () => {
  test('テキスト入力後300msで結果が更新される', async ({ page }) => {
    await page.goto('/search')

    const input = page.locator('input[type="search"]')
    await input.fill(KEYWORD)

    // 300ms debounce + APIレスポンス待ち
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    // URLのqパラメータが更新されている
    await expect(page).toHaveURL(new RegExp(`q=${ENCODED_KEYWORD}`), { timeout: 5000 })

    await page.screenshot({ path: SS('07_input_search') })
  })

  test('クリアボタンで検索クエリがリセットされる', async ({ page }) => {
    await page.goto(`/search?q=${ENCODED_KEYWORD}`)
    await expect(page.getByText(/件見つかりました/)).toBeVisible({ timeout: 20000 })

    // 検索インプット内の ✕ ボタン（absolute right-3）を確実に取得
    const searchContainer = page.locator('div.relative').filter({
      has: page.locator('input[type="search"]'),
    })
    await searchContainer.locator('button').click()

    // q パラメータが URL から消える
    await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 5000 })

    // インプットが空になる
    await expect(page.locator('input[type="search"]')).toHaveValue('', { timeout: 5000 })

    // クリアボタン自体が消える（q=null になったため）
    await expect(searchContainer.locator('button')).toBeHidden({ timeout: 5000 })

    await page.screenshot({ path: SS('08_clear_search') })
  })
})
