import 'server-only'
import { cache } from 'react'
import {
  DmmItemListResponseSchema,
  DmmActressResponseSchema,
  DmmFloorListResponseSchema,
} from '@/types/dmm'
import type { DmmItemListResponse, DmmActressResponse, DmmFloorListResponse } from '@/types/dmm'

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

// 連続リクエスト時のレート制限対策（500ms スリープ）
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ------------------------------------
// 商品一覧
// ------------------------------------
export type FetchItemListParams = {
  site?: string
  service?: string
  floor?: string
  hits?: number
  offset?: number
  sort?: 'rank' | 'date' | 'price' | '-price' | 'review_rank' | 'match'
  keyword?: string
  article?: string
  article_id?: number
  gte_date?: string
  lte_date?: string
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
      article: params.article,
      article_id: params.article_id,
      gte_date: params.gte_date,
      lte_date: params.lte_date,
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
  sort?: 'id' | '-id' | 'name' | 'bust' | '-bust' | 'waist' | '-waist' | 'hip' | '-hip' | 'height' | '-height' | 'birthday' | '-birthday'
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
}

export const fetchActressList = cache(
  async (params: FetchActressListParams = {}): Promise<DmmActressResponse['result']> => {
    const searchParams = buildParams({
      site: 'FANZA',
      hits: params.hits ?? 20,
      offset: params.offset ?? 1,
      sort: params.sort,
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
