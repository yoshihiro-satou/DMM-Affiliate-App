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

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 500
const TOP_ITEMS_LIMIT = 100
const DMM_API_BASE = 'https://api.dmm.com/affiliate/v3'
// 同一ユーザー・同一作品への値下げ通知の最小間隔（価格の上下動による連投を防ぐ）
const PRICE_DROP_DEDUP_HOURS = 24

// ── Supabase REST ヘルパー ────────────────────────────────────────────────────

function sbHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function getTopFavoritedItems(env: Env): Promise<string[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_top_favorited_items`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=representation' },
    body: JSON.stringify({ limit_count: TOP_ITEMS_LIMIT }),
  })
  if (!res.ok) {
    console.error('[price-monitor] getTopFavoritedItems error:', res.status, await res.text())
    return []
  }
  const data = (await res.json()) as Array<{ item_id: string }>
  return data.map((d) => d.item_id)
}

// 直近に記録した価格（=今回挿入の「前回」）を取得する。無ければ null。
async function getLatestRecordedPrice(env: Env, itemId: string): Promise<number | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/price_history?item_id=eq.${encodeURIComponent(
    itemId
  )}&select=price&order=recorded_at.desc&limit=1`
  const res = await fetch(url, { headers: sbHeaders(env) })
  if (!res.ok) return null
  const rows = (await res.json()) as Array<{ price: number }>
  return rows[0]?.price ?? null
}

async function insertPriceHistory(
  env: Env,
  itemId: string,
  price: number,
  listPrice: number | null,
  discountRate: number | null
): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/price_history`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify({ item_id: itemId, price, list_price: listPrice, discount_rate: discountRate }),
  })
  if (!res.ok) console.error(`[price-monitor] insertPriceHistory(${itemId}) error:`, res.status)
}

// 当該作品をお気に入り登録していて、かつ push 購読のあるユーザーを返す（item_title 付き）。
async function getDropTargets(
  env: Env,
  itemId: string
): Promise<{ userId: string; title: string }[]> {
  const favUrl = `${env.SUPABASE_URL}/rest/v1/favorites?item_id=eq.${encodeURIComponent(
    itemId
  )}&select=user_id,item_title`
  const favRes = await fetch(favUrl, { headers: sbHeaders(env) })
  if (!favRes.ok) return []
  const favs = (await favRes.json()) as Array<{ user_id: string; item_title: string | null }>
  if (favs.length === 0) return []

  const userIds = [...new Set(favs.map((f) => f.user_id))]
  const inList = userIds.map((id) => `"${id}"`).join(',')
  const subUrl = `${env.SUPABASE_URL}/rest/v1/notification_subscriptions?user_id=in.(${inList})&select=user_id`
  const subRes = await fetch(subUrl, { headers: sbHeaders(env) })
  if (!subRes.ok) return []
  const subscribed = new Set(
    ((await subRes.json()) as Array<{ user_id: string }>).map((s) => s.user_id)
  )

  const titleByUser = new Map<string, string>()
  for (const f of favs) {
    if (!titleByUser.has(f.user_id)) titleByUser.set(f.user_id, f.item_title ?? 'お気に入り作品')
  }

  return userIds
    .filter((id) => subscribed.has(id))
    .map((id) => ({ userId: id, title: titleByUser.get(id) ?? 'お気に入り作品' }))
}

// 直近 N 時間以内に同一ユーザー・同一作品へ price_drop を積んでいれば true。
async function wasDropNotifiedRecently(env: Env, userId: string, itemId: string): Promise<boolean> {
  const since = new Date(Date.now() - PRICE_DROP_DEDUP_HOURS * 3600_000).toISOString()
  const url =
    `${env.SUPABASE_URL}/rest/v1/notification_queue?type=eq.price_drop` +
    `&user_id=eq.${encodeURIComponent(userId)}` +
    `&payload->>item_id=eq.${encodeURIComponent(itemId)}` +
    `&created_at=gte.${encodeURIComponent(since)}&select=id&limit=1`
  const res = await fetch(url, { headers: sbHeaders(env) })
  if (!res.ok) return false
  const rows = (await res.json()) as unknown[]
  return rows.length > 0
}

async function enqueuePriceDrops(
  env: Env,
  rows: Array<Record<string, unknown>>
): Promise<void> {
  if (rows.length === 0) return
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/notification_queue`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) console.error('[price-monitor] enqueuePriceDrops error:', res.status, await res.text())
}

// ── DMM API ───────────────────────────────────────────────────────────────────

type DmmItemResult = {
  price: number
  listPrice: number | null
}

function parseIntPrice(s: string | undefined): number | null {
  if (!s) return null
  const n = parseInt(s.replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}

async function fetchItemPrice(env: Env, itemId: string): Promise<DmmItemResult | null> {
  const params = new URLSearchParams({
    api_id: env.DMM_API_ID,
    affiliate_id: env.DMM_AFFILIATE_ID,
    output: 'json',
    site: 'FANZA',
    hits: '1',
    cid: itemId,
  })
  const res = await fetch(`${DMM_API_BASE}/ItemList?${params}`)
  if (!res.ok) return null

  const json = (await res.json()) as {
    result?: {
      items?: Array<{
        prices?: { price?: string; list_price?: string }
      }>
    }
  }

  const item = json?.result?.items?.[0]
  if (!item) return null

  const price = parseIntPrice(item.prices?.price)
  if (price === null || price <= 0) return null

  return {
    price,
    listPrice: parseIntPrice(item.prices?.list_price),
  }
}

// ── アイテム処理 ──────────────────────────────────────────────────────────────

type RunStats = { processed: number; recorded: number; drops: number; queued: number }

async function processItem(env: Env, itemId: string, stats: RunStats): Promise<void> {
  const current = await fetchItemPrice(env, itemId)
  if (!current) return
  stats.processed++

  // 「前回」価格を挿入前に取得して値下げ判定する
  const prevPrice = await getLatestRecordedPrice(env, itemId)

  const discountRate =
    current.listPrice !== null && current.listPrice > current.price
      ? Math.round((1 - current.price / current.listPrice) * 100)
      : null

  await insertPriceHistory(env, itemId, current.price, current.listPrice, discountRate)
  stats.recorded++

  // 前回より下がっていれば、お気に入り登録済みの購読ユーザーへ値下げ通知（追加22）
  if (prevPrice === null || current.price >= prevPrice) return
  stats.drops++

  const targets = await getDropTargets(env, itemId)
  if (targets.length === 0) return

  const rows: Array<Record<string, unknown>> = []
  for (const t of targets) {
    if (await wasDropNotifiedRecently(env, t.userId, itemId)) continue
    const off = Math.round((1 - current.price / prevPrice) * 100)
    rows.push({
      user_id: t.userId,
      endpoint: null,
      type: 'price_drop',
      status: 'pending',
      payload: {
        title: 'お気に入りが値下げ🔻',
        body: `「${t.title.slice(0, 32)}」が ${prevPrice.toLocaleString()}円 → ${current.price.toLocaleString()}円${
          off > 0 ? `（${off}%OFF）` : ''
        }`,
        // ?ref=push_drop で「通知→クリック」を計測（追加18）
        url: '/favorites?ref=push_drop',
        tag: 'price_drop',
        item_id: itemId,
      },
    })
  }

  await enqueuePriceDrops(env, rows)
  stats.queued += rows.length
}

// ── メインロジック ─────────────────────────────────────────────────────────────

// item_id が URL パラメータに安全か確認（PostgREST の in.() 構文保護）
function isSafeItemId(id: string): boolean {
  return /^[\w-]+$/.test(id)
}

async function runPriceMonitor(env: Env): Promise<RunStats> {
  console.log('[price-monitor] start')
  const stats: RunStats = { processed: 0, recorded: 0, drops: 0, queued: 0 }

  const rawIds = await getTopFavoritedItems(env)
  const itemIds = rawIds.filter(isSafeItemId)
  if (itemIds.length !== rawIds.length) {
    console.error(`[price-monitor] filtered ${rawIds.length - itemIds.length} invalid item_ids`)
  }
  if (itemIds.length === 0) {
    console.log('[price-monitor] no favorited items')
    return stats
  }

  console.log(`[price-monitor] processing ${itemIds.length} items`)

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((id) =>
        processItem(env, id, stats).catch((err: unknown) =>
          console.error(`[price-monitor] item ${id} error:`, err)
        )
      )
    )
    if (i + BATCH_SIZE < itemIds.length) {
      await new Promise<void>((r) => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  console.log('[price-monitor] done', JSON.stringify(stats))
  return stats
}

// ── エントリーポイント ─────────────────────────────────────────────────────────

const handler = {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(runPriceMonitor(env))
  },

  // 手動トリガー（スモークテスト用）。?key=<SERVICE_ROLE_KEY> で保護。
  async fetch(request: Request, env: Env): Promise<Response> {
    const key = new URL(request.url).searchParams.get('key')
    if (!key || key !== env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('forbidden', { status: 403 })
    }
    const stats = await runPriceMonitor(env)
    return Response.json(stats)
  },
}

export default handler
