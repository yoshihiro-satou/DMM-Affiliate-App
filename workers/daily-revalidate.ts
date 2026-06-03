// 毎日 0:01 JST にトップページの ISR キャッシュを破棄して日替わり商品を最新化する
// デプロイ: wrangler deploy --config workers/daily-revalidate.toml

interface ScheduledController {
  readonly cron: string
  readonly scheduledTime: number
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

export interface Env {
  SITE_URL: string           // 例: https://your-site.pages.dev
  REVALIDATE_SECRET: string  // NEXT_PUBLIC_ なし。wrangler secret put で登録
}

async function revalidateHome(env: Env): Promise<void> {
  const headers = {
    'x-revalidate-secret': env.REVALIDATE_SECRET,
    'Content-Type': 'application/json',
  }

  const [revalidateRes, notifyRes, saleRes, badgeRes, directorRes] = await Promise.all([
    fetch(`${env.SITE_URL}/api/revalidate`, { method: 'POST', headers }),
    fetch(`${env.SITE_URL}/api/oshi-notify`, { method: 'POST', headers }),
    fetch(`${env.SITE_URL}/api/sale-notify`, { method: 'POST', headers }),
    fetch(`${env.SITE_URL}/api/badge-remind`, { method: 'POST', headers }),
    fetch(`${env.SITE_URL}/api/oshi-director-notify`, { method: 'POST', headers }),
  ])

  const [revalidateBody, notifyBody, saleBody, badgeBody, directorBody] = await Promise.all([
    revalidateRes.text(),
    notifyRes.text(),
    saleRes.text(),
    badgeRes.text(),
    directorRes.text(),
  ])

  console.log('[daily-revalidate] revalidate:', revalidateRes.status, revalidateBody)
  console.log('[daily-revalidate] oshi-notify:', notifyRes.status, notifyBody)
  console.log('[daily-revalidate] sale-notify:', saleRes.status, saleBody)
  console.log('[daily-revalidate] badge-remind:', badgeRes.status, badgeBody)
  console.log('[daily-revalidate] director-notify:', directorRes.status, directorBody)
}

const handler = {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(revalidateHome(env))
  },
}

export default handler
