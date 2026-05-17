import { test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'age_check_done', value: '1', domain: 'localhost', path: '/' },
  ])
})

test('デバイス別レイアウト確認', async ({ page }, testInfo) => {
  await page.goto('/discover')
  await page.locator('h2').first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(1500)
  const name = testInfo.project.name.replace(/[^a-zA-Z0-9]/g, '_')
  await page.screenshot({ path: `tests/screenshots/device_${name}.png` })
})
