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

async function processItem(env: Env, itemId: string): Promise<void> {
  const current = await fetchItemPrice(env, itemId)
  if (!current) return

  const discountRate =
    current.listPrice !== null && current.listPrice > current.price
      ? Math.round((1 - current.price / current.listPrice) * 100)
      : null

  await insertPriceHistory(env, itemId, current.price, current.listPrice, discountRate)
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

  console.log(`[price-monitor] processing ${itemIds.length} items`)

  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((id) =>
        processItem(env, id).catch((err: unknown) =>
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
