// Minimal Cloudflare Workers runtime types (avoids @cloudflare/workers-types dependency)
interface ScheduledController {
  readonly cron: string
  readonly scheduledTime: number
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  DMM_API_ID: string
  DMM_AFFILIATE_ID: string
}

// ── 定数 ─────────────────────────────────────────────────────────────────────

const DMM_API_BASE = 'https://api.dmm.com/affiliate/v3'
const BATCH_DELAY_MS = 500

// ── Supabase REST ヘルパー ────────────────────────────────────────────────────

function sbHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

type FollowedSeriesRow = {
  id: string
  user_id: string
  series_id: number
  series_name: string
  latest_item_id: string | null
}

async function getFollowedSeries(env: Env): Promise<FollowedSeriesRow[]> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/followed_series?select=*&limit=1000`,
    { headers: sbHeaders(env) }
  )
  if (!res.ok) {
    console.error('[series-monitor] getFollowedSeries error:', res.status, await res.text())
    return []
  }
  return (await res.json()) as FollowedSeriesRow[]
}

async function updateLatestItemId(
  env: Env,
  followId: string,
  latestItemId: string
): Promise<void> {
  const encodedId = encodeURIComponent(followId)
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/followed_series?id=eq.${encodedId}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
      body: JSON.stringify({ latest_item_id: latestItemId }),
    }
  )
  if (!res.ok) console.error('[series-monitor] updateLatestItemId error:', res.status)
}

type NotificationPayload = {
  series_id: number
  series_name: string
  item_id: string
  item_title: string
  affiliate_url: string
  image_url: string | null
}

async function enqueueNotification(
  env: Env,
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/notification_queue`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, type: 'new_release', payload }),
  })
  if (!res.ok) console.error('[series-monitor] enqueueNotification error:', res.status)
}

// ── DMM API ───────────────────────────────────────────────────────────────────

type LatestItem = {
  item_id: string
  title: string
  affiliate_url: string
  image_url: string | null
}

async function fetchLatestItem(env: Env, seriesId: number): Promise<LatestItem | null> {
  const params = new URLSearchParams({
    api_id: env.DMM_API_ID,
    affiliate_id: env.DMM_AFFILIATE_ID,
    output: 'json',
    site: 'FANZA',
    article: 'series',
    article_id: String(seriesId),
    hits: '1',
    sort: 'date',
  })
  const res = await fetch(`${DMM_API_BASE}/ItemList?${params}`)
  if (!res.ok) return null

  const json = (await res.json()) as {
    result?: {
      items?: Array<{
        content_id?: string
        title?: string
        affiliateURL?: string
        imageURL?: { list?: string; large?: string }
      }>
    }
  }

  const item = json?.result?.items?.[0]
  if (!item?.content_id || !item.affiliateURL) return null

  return {
    item_id: item.content_id,
    title: item.title ?? '',
    affiliate_url: item.affiliateURL,
    image_url: item.imageURL?.list ?? item.imageURL?.large ?? null,
  }
}

// ── シリーズごとの処理 ─────────────────────────────────────────────────────────

async function processSeriesGroup(
  env: Env,
  seriesId: number,
  followers: FollowedSeriesRow[]
): Promise<void> {
  const latest = await fetchLatestItem(env, seriesId)
  if (!latest) return

  for (const follow of followers) {
    if (follow.latest_item_id === latest.item_id) continue

    // 新刊検知 → notification_queue に追加
    await enqueueNotification(env, follow.user_id, {
      series_id: seriesId,
      series_name: follow.series_name,
      item_id: latest.item_id,
      item_title: latest.title,
      affiliate_url: latest.affiliate_url,
      image_url: latest.image_url,
    })
    await updateLatestItemId(env, follow.id, latest.item_id)

    console.log(
      `[series-monitor] new release series=${seriesId} (${follow.series_name}) item=${latest.item_id}`
    )
  }
}

// ── メインロジック ─────────────────────────────────────────────────────────────

async function runSeriesMonitor(env: Env): Promise<void> {
  console.log('[series-monitor] start')

  const followed = await getFollowedSeries(env)
  if (followed.length === 0) {
    console.log('[series-monitor] no followed series')
    return
  }

  // series_id でグループ化（同一シリーズを1回の API 呼び出しで済ませる）
  const bySeriesId = new Map<number, FollowedSeriesRow[]>()
  for (const row of followed) {
    const list = bySeriesId.get(row.series_id) ?? []
    list.push(row)
    bySeriesId.set(row.series_id, list)
  }

  console.log(`[series-monitor] checking ${bySeriesId.size} series`)

  const seriesIds = [...bySeriesId.keys()]
  for (let i = 0; i < seriesIds.length; i++) {
    if (i > 0) await new Promise<void>((r) => setTimeout(r, BATCH_DELAY_MS))
    const seriesId = seriesIds[i]
    await processSeriesGroup(env, seriesId, bySeriesId.get(seriesId)!).catch(
      (err: unknown) => console.error(`[series-monitor] series ${seriesId} error:`, err)
    )
  }

  console.log('[series-monitor] done')
}

// ── エントリーポイント ─────────────────────────────────────────────────────────

const handler = {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(runSeriesMonitor(env))
  },
}

export default handler
