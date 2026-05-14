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
const MIN_DISCOUNT_RATE = 10
const QUEUE_COOLDOWN_MS = 72 * 60 * 60 * 1000
const TOP_ITEMS_LIMIT = 100
const SALE_STATUS_PENDING = 'pending' as const
const DMM_API_BASE = 'https://api.dmm.com/affiliate/v3'

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

async function getLatestPrices(env: Env, itemIds: string[]): Promise<Map<string, number>> {
  // DISTINCT ON でアイテムごとの最新価格のみを取得 — limit によるデータ漏れなし
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_latest_prices`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=representation' },
    body: JSON.stringify({ item_ids: itemIds }),
  })
  if (!res.ok) {
    console.error('[price-monitor] getLatestPrices error:', res.status)
    return new Map()
  }
  const rows = (await res.json()) as Array<{ item_id: string; price: number }>
  return new Map(rows.map((r) => [r.item_id, r.price]))
}

async function getRecentlyQueuedItems(env: Env): Promise<Set<string>> {
  const since = new Date(Date.now() - QUEUE_COOLDOWN_MS).toISOString()
  const url =
    `${env.SUPABASE_URL}/rest/v1/sale_queue` +
    `?created_at=gte.${encodeURIComponent(since)}` +
    `&select=item_id` +
    `&limit=500`
  const res = await fetch(url, { headers: sbHeaders(env) })
  if (!res.ok) {
    console.error('[price-monitor] getRecentlyQueuedItems error:', res.status)
    return new Set()
  }
  const rows = (await res.json()) as Array<{ item_id: string }>
  return new Set(rows.map((r) => r.item_id))
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

type SaleQueuePayload = {
  itemId: string
  itemTitle: string
  affiliateUrl: string
  imageUrl: string | null
  price: number
  originalPrice: number
  discountRate: number
}

async function insertSaleQueue(env: Env, payload: SaleQueuePayload): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sale_queue`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify({
      item_id: payload.itemId,
      item_title: payload.itemTitle,
      affiliate_url: payload.affiliateUrl,
      image_url: payload.imageUrl,
      price: payload.price,
      original_price: payload.originalPrice,
      discount_rate: payload.discountRate,
      status: SALE_STATUS_PENDING,
    }),
  })
  if (!res.ok) console.error(`[price-monitor] insertSaleQueue(${payload.itemId}) error:`, res.status)
}

// ── DMM API ───────────────────────────────────────────────────────────────────

type DmmItemResult = {
  price: number
  listPrice: number | null
  affiliateUrl: string
  title: string
  imageUrl: string | null
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
        affiliateURL?: string
        title?: string
        imageURL?: { list?: string; large?: string }
      }>
    }
  }

  const item = json?.result?.items?.[0]
  if (!item) return null

  const price = parseIntPrice(item.prices?.price)
  if (price === null || price <= 0) return null

  // affiliateURL は sale_queue の NOT NULL カラムなので空の場合はスキップ
  if (!item.affiliateURL) return null

  return {
    price,
    listPrice: parseIntPrice(item.prices?.list_price),
    affiliateUrl: item.affiliateURL,
    title: item.title ?? '',
    imageUrl: item.imageURL?.list ?? item.imageURL?.large ?? null,
  }
}

// ── アイテム処理 ──────────────────────────────────────────────────────────────

async function processItem(
  env: Env,
  itemId: string,
  latestPrices: Map<string, number>,
  recentlyQueued: Set<string>
): Promise<void> {
  const current = await fetchItemPrice(env, itemId)
  if (!current) return

  // 割引率を一箇所で計算し price_history と sale_queue に一貫した値を使用
  const discountRate =
    current.listPrice !== null && current.listPrice > current.price
      ? Math.round((1 - current.price / current.listPrice) * 100)
      : null

  await insertPriceHistory(env, itemId, current.price, current.listPrice, discountRate)

  const prevPrice = latestPrices.get(itemId)
  if (prevPrice === undefined) return // 初回記録 — 比較ベースなし

  if (current.price >= prevPrice) return
  if (recentlyQueued.has(itemId)) return
  if (!current.title) return // item_title は sale_queue の NOT NULL カラム

  // listPrice がない場合は前回価格との差分で割引率を計算
  const queueDiscountRate =
    discountRate !== null
      ? discountRate
      : Math.round((1 - current.price / prevPrice) * 100)

  if (queueDiscountRate < MIN_DISCOUNT_RATE) return

  await insertSaleQueue(env, {
    itemId,
    itemTitle: current.title,
    affiliateUrl: current.affiliateUrl,
    imageUrl: current.imageUrl,
    price: current.price,
    originalPrice: prevPrice,
    discountRate: queueDiscountRate,
  })

  console.log(
    `[price-monitor] queued ${itemId}: ¥${prevPrice} → ¥${current.price} (-${queueDiscountRate}%)`
  )
}

// ── メインロジック ─────────────────────────────────────────────────────────────

// item_id が URL パラメータに安全か確認（PostgREST の in.() 構文保護）
function isSafeItemId(id: string): boolean {
  return /^[\w-]+$/.test(id)
}

async function runPriceMonitor(env: Env): Promise<void> {
  console.log('[price-monitor] start')

  const rawIds = await getTopFavoritedItems(env)
  const itemIds = rawIds.filter(isSafeItemId)
  if (itemIds.length !== rawIds.length) {
    console.error(`[price-monitor] filtered ${rawIds.length - itemIds.length} invalid item_ids`)
  }
  if (itemIds.length === 0) {
    console.log('[price-monitor] no favorited items')
    return
  }

  const [latestPrices, recentlyQueued] = await Promise.all([
    getLatestPrices(env, itemIds),
    getRecentlyQueuedItems(env),
  ])

  console.log(`[price-monitor] processing ${itemIds.length} items`)

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((id) =>
        processItem(env, id, latestPrices, recentlyQueued).catch((err: unknown) =>
          console.error(`[price-monitor] item ${id} error:`, err)
        )
      )
    )
    if (i + BATCH_SIZE < itemIds.length) {
      await new Promise<void>((r) => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  console.log('[price-monitor] done')
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
}

export default handler
