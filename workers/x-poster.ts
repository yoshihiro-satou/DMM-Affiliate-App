/**
 * Cloudflare Workers: X（Twitter）自動投稿
 * sale_queue から pending レコードを取得して X API v2 で投稿する
 * 1日3回（JST 7時 / 12時 / 20時）cron 実行
 *
 * 環境変数（wrangler secret put で登録）:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */

interface ScheduledController { readonly scheduledTime: number }
interface ExecutionContext {
  waitUntil(p: Promise<unknown>): void
}

export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  X_API_KEY: string
  X_API_SECRET: string
  X_ACCESS_TOKEN: string
  X_ACCESS_TOKEN_SECRET: string
}

const MAX_POSTS_PER_RUN = 3
const X_TWEETS_URL = 'https://api.twitter.com/2/tweets'

// ── ユーティリティ ─────────────────────────────────────────────────────────────

function pct(s: string): string {
  return encodeURIComponent(s)
}

function formatPrice(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// ── OAuth 1.0a (HMAC-SHA1) ────────────────────────────────────────────────────

async function hmacSha1(key: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const k = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

async function buildOAuthHeader(method: string, url: string, env: Env): Promise<string> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const params: Record<string, string> = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  }

  // パラメータをアルファベット順にソートしてベース文字列を構築
  const sortedParam = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${pct(k)}=${pct(v)}`)
    .join('&')

  const baseString = `${method.toUpperCase()}&${pct(url)}&${pct(sortedParam)}`
  const signingKey = `${pct(env.X_API_SECRET)}&${pct(env.X_ACCESS_TOKEN_SECRET)}`
  const signature = await hmacSha1(signingKey, baseString)

  params.oauth_signature = signature

  const headerValue = Object.entries(params)
    .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
    .join(', ')

  return `OAuth ${headerValue}`
}

// ── Tweet テキスト生成 ─────────────────────────────────────────────────────────

type SaleItem = {
  id: string
  item_id: string
  item_title: string
  affiliate_url: string
  price: number
  original_price: number
  discount_rate: number
  favorite_count: number
}

function buildTweetText(item: SaleItem): string {
  const title = item.item_title.length > 30
    ? item.item_title.slice(0, 30) + '…'
    : item.item_title
  const lines = [
    '🔥 値下げ速報',
    `「${title}」`,
    `¥${formatPrice(item.original_price)} → ¥${formatPrice(item.price)}（${item.discount_rate}%OFF）`,
    `▶ ${item.affiliate_url}`,
    '#FANZA #値下げ #セール',
  ]
  return lines.join('\n')
}

// ── Supabase REST ヘルパー ────────────────────────────────────────────────────

function sbHeaders(env: Env): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function getPendingItems(env: Env): Promise<SaleItem[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_pending_sale_items`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=representation' },
    body: JSON.stringify({ max_count: MAX_POSTS_PER_RUN }),
  })
  if (!res.ok) {
    console.error('[x-poster] getPendingItems error:', res.status, await res.text())
    return []
  }
  return (await res.json()) as SaleItem[]
}

async function markPosted(env: Env, id: string): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sale_queue?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'posted', posted_at: new Date().toISOString() }),
  })
  if (!res.ok) console.error(`[x-poster] markPosted(${id}) error:`, res.status)
}

// ── X API v2 投稿 ─────────────────────────────────────────────────────────────

async function postTweet(text: string, env: Env): Promise<boolean> {
  const authHeader = await buildOAuthHeader('POST', X_TWEETS_URL, env)
  const res = await fetch(X_TWEETS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('[x-poster] postTweet failed:', res.status, body)
    return false
  }
  return true
}

// ── メインロジック ─────────────────────────────────────────────────────────────

async function runXPoster(env: Env): Promise<void> {
  console.log('[x-poster] start')

  const items = await getPendingItems(env)
  if (items.length === 0) {
    console.log('[x-poster] no pending items')
    return
  }

  let posted = 0
  for (const item of items) {
    if (posted >= MAX_POSTS_PER_RUN) break

    const text = buildTweetText(item)
    const ok = await postTweet(text, env)

    if (ok) {
      await markPosted(env, item.id)
      console.log(`[x-poster] posted ${item.item_id}: ${item.item_title.slice(0, 20)}`)
      posted++
    } else {
      // 送信失敗は pending のまま残し、次回の cron で再試行
      console.error(`[x-poster] failed to post ${item.item_id}, skipping this run`)
    }
  }

  console.log(`[x-poster] done: posted ${posted}/${items.length} items`)
}

// ── エントリーポイント ─────────────────────────────────────────────────────────

const handler = {
  async scheduled(_: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runXPoster(env))
  },
  async fetch(_: Request, env: Env): Promise<Response> {
    await runXPoster(env)
    return new Response('ok')
  },
}

export default handler
