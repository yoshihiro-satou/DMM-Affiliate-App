import { test, expect } from '@playwright/test'

const WIDTHS = [
  { w: 273, h: 600, label: '273_600' },
  { w: 375, h: 667, label: '375_667_iPhoneSE' },
  { w: 390, h: 844, label: '390_844_iPhone14' },
  { w: 393, h: 852, label: '393_852_iPhone15' },
  { w: 430, h: 932, label: '430_932_iPhone15Plus' },
]

// 単一ブラウザで幅ごとのレイアウトをスクリーンショット確認
test.use({ browserName: 'chromium', viewport: { width: 393, height: 852 } })

test('discoverカード: 複数幅でCTAが底部に固定される', async ({ page }) => {
  await page.context().addCookies([
    { name: 'age_check_done', value: '1', domain: 'localhost', path: '/' },
  ])

  for (const { w, h, label } of WIDTHS) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('/discover')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 20000 })
    await page.waitForTimeout(1000)

    const metrics = await page.evaluate(() => {
      const card = document.querySelector('.absolute.inset-x-4') as HTMLElement | null
      const allLinks = card ? Array.from(card.querySelectorAll('a')) : []
      const ctaLink = allLinks.find(a => a.textContent?.trim() === 'FANZAで見る') ?? null
      const cardRect = card?.getBoundingClientRect()
      const ctaRect = ctaLink?.getBoundingClientRect()
      const ctaParentStyle = ctaLink?.parentElement ? window.getComputedStyle(ctaLink.parentElement) : null
      return {
        cardH: Math.round(cardRect?.height ?? 0),
        ctaH: Math.round(ctaRect?.height ?? 0),
        ctaMarginTop: ctaParentStyle?.marginTop,
        emptyBelowCta: Math.round((cardRect?.bottom ?? 0) - (ctaRect?.bottom ?? 0)),
      }
    })

    console.log(`[${label}] card:${metrics.cardH} ctaH:${metrics.ctaH} mt:${metrics.ctaMarginTop} belowCTA:${metrics.emptyBelowCta}px`)

    await page.screenshot({ path: `tests/screenshots/layout_${label}.png` })

    // CTAが表示されており、カード底部の余白が100px以下であること
    await expect(page.getByRole('link', { name: 'FANZAで見る' }).first()).toBeVisible()
    expect(metrics.emptyBelowCta).toBeLessThan(100)
  }
})
