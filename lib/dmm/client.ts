import 'server-only'
import { cache } from 'react'
import {
  DmmItemListResponseSchema,
  DmmActressResponseSchema,
  DmmFloorListResponseSchema,
} from '@/types/dmm'
import type { DmmItem, DmmItemListResponse, DmmActressResponse, DmmFloorListResponse, ItemSort, ActressSort, Article } from '@/types/dmm'

const BASE_URL = 'https://api.dmm.com/affiliate/v3'

function getCredentials() {
  const api_id = process.env.DMM_API_ID
  const affiliate_id = process.env.DMM_AFFILIATE_ID
  if (!api_id || !affiliate_id) {
    throw new Error('DMM_API_ID または DMM_AFFILIATE_ID が未設定です')
  }
  return { api_id, affiliate_id }
}

function buildParams(extra: Record<string, string | number | undefined>): URLSearchParams {
  const { api_id, affiliate_id } = getCredentials()
  const params = new URLSearchParams({ api_id, affiliate_id, output: 'json' })
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) params.set(key, String(value))
  }
  return params
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ------------------------------------
// 商品一覧
// ------------------------------------
export type FetchItemListParams = {
  site?: string
  service?: string
  floor?: string
  hits?: number
  offset?: number
  sort?: ItemSort
  keyword?: string
  cid?: string
  article?: Article
  article_id?: number
  gte_date?: string
  lte_date?: string
  mono_stock?: 'stock' | 'reserve' | 'reserve_empty' | 'mono'
}

export const fetchItemList = cache(
  async (params: FetchItemListParams = {}): Promise<DmmItemListResponse['result']> => {
    const searchParams = buildParams({
      site: params.site ?? 'FANZA',
      service: params.service,
      floor: params.floor,
      hits: params.hits ?? 20,
      offset: params.offset ?? 1,
      sort: params.sort,
      keyword: params.keyword,
      cid: params.cid,
      article: params.article,
      article_id: params.article_id,
      gte_date: params.gte_date,
      lte_date: params.lte_date,
      mono_stock: params.mono_stock,
    })

    const res = await fetch(`${BASE_URL}/ItemList?${searchParams}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`DMM ItemList API Error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    const parsed = DmmItemListResponseSchema.safeParse(json)
    if (!parsed.success) {
      throw new Error(`DMM ItemList レスポンスパースエラー: ${parsed.error.message}`)
    }
    return parsed.data.result
  }
)

// ------------------------------------
// 女優一覧
// ------------------------------------
export type FetchActressListParams = {
  hits?: number
  offset?: number
  sort?: ActressSort
  initial?: string
  keyword?: string
  actress_id?: number
  gte_bust?: number
  lte_bust?: number
  gte_waist?: number
  lte_waist?: number
  gte_hip?: number
  lte_hip?: number
  gte_height?: number
  lte_height?: number
  gte_birthday?: string
  lte_birthday?: string
}

export const fetchActressList = cache(
  async (params: FetchActressListParams = {}): Promise<DmmActressResponse['result']> => {
    // ActressSearch は site / sort / offset を受け付けない（400 になる）
    const searchParams = buildParams({
      hits: params.hits ?? 20,
      initial: params.initial,
      keyword: params.keyword,
      actress_id: params.actress_id,
      gte_bust: params.gte_bust,
      lte_bust: params.lte_bust,
      gte_waist: params.gte_waist,
      lte_waist: params.lte_waist,
      gte_hip: params.gte_hip,
      lte_hip: params.lte_hip,
      gte_height: params.gte_height,
      lte_height: params.lte_height,
      gte_birthday: params.gte_birthday,
      lte_birthday: params.lte_birthday,
    })

    const res = await fetch(`${BASE_URL}/ActressSearch?${searchParams}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`DMM ActressSearch API Error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    const parsed = DmmActressResponseSchema.safeParse(json)
    if (!parsed.success) {
      throw new Error(`DMM ActressSearch レスポンスパースエラー: ${parsed.error.message}`)
    }
    return parsed.data.result
  }
)

// ------------------------------------
// フロア一覧（日次キャッシュ）
// ------------------------------------
export const fetchFloorList = cache(
  async (): Promise<DmmFloorListResponse['result']> => {
    const searchParams = buildParams({})

    const res = await fetch(`${BASE_URL}/FloorList?${searchParams}`, {
      next: { revalidate: 86400 },
    })

    if (!res.ok) {
      throw new Error(`DMM FloorList API Error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    const parsed = DmmFloorListResponseSchema.safeParse(json)
    if (!parsed.success) {
      throw new Error(`DMM FloorList レスポンスパースエラー: ${parsed.error.message}`)
    }
    return parsed.data.result
  }
)

// ------------------------------------
// 日替わりセール商品（JST深夜0時でキャッシュ失効）
// ------------------------------------

export function secondsUntilMidnightJST(): number {
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(now.getTime() + jstOffset)
  const nextMidnightUTC = new Date(
    Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), nowJST.getUTCDate() + 1) - jstOffset
  )
  return Math.max(60, Math.floor((nextMidnightUTC.getTime() - now.getTime()) / 1000))
}

async function fetchBatch(sort: 'rank' | 'review', ttl: number): Promise<DmmItem[]> {
  const searchParams = buildParams({
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    hits: 100,
    sort,
  })
  const res = await fetch(`${BASE_URL}/ItemList?${searchParams}`, {
    next: { revalidate: ttl },
  })
  if (!res.ok) return []
  const json = await res.json()
  const parsed = DmmItemListResponseSchema.safeParse(json)
  return parsed.success ? parsed.data.result.items : []
}

export async function fetchDailySaleItems(hits = 12): Promise<DmmItem[]> {
  const ttl = secondsUntilMidnightJST()

  // rank上位100 + review上位100 を並列取得して合算
  const [rankItems, reviewItems] = await Promise.all([
    fetchBatch('rank', ttl),
    fetchBatch('review', ttl),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const seen = new Set<string>()

  return [...rankItems, ...reviewItems]
    .filter(item => {
      if (seen.has(item.content_id)) return false
      seen.add(item.content_id)

      // VR作品を除外
      if (item.iteminfo?.genre?.some(g => g.name?.includes('VR'))) return false

      const hasActiveCampaign = item.campaign?.some(c => c.date_end >= today)
      const p  = parseFloat((item.prices.price      ?? '').replace('~', ''))
      const lp = parseFloat((item.prices.list_price ?? '').replace('~', ''))
      const hasDiscount = !isNaN(p) && !isNaN(lp) && lp > p

      return hasActiveCampaign || hasDiscount
    })
    .slice(0, hits)
}

// ------------------------------------
// 複数リクエストを直列実行（レート制限対策）
// ------------------------------------
export async function fetchWithRateLimit<T>(
  requests: Array<() => Promise<T>>,
  delayMs = 500
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < requests.length; i++) {
    if (i > 0) await sleep(delayMs)
    results.push(await requests[i]())
  }
  return results
}
