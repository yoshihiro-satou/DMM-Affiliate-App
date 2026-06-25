import 'server-only'
import { cache } from 'react'
import {
  DmmItemListResponseSchema,
  DmmActressResponseSchema,
  DmmFloorListResponseSchema,
  DmmGenreResponseSchema,
} from '@/types/dmm'
import type { DmmItem, DmmItemListResponse, DmmActressResponse, DmmFloorListResponse, DmmGenreResponse, ItemSort, ActressSort, Article } from '@/types/dmm'
import { isOnSale } from '@/lib/ranking'

const BASE_URL = 'https://api.dmm.com/affiliate/v3'

type CfEnv = Record<string, string | undefined>

function getCfEnv(): CfEnv {
  // Cloudflare Workers runtime stores the request env in globalThis via AsyncLocalStorage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (globalThis as any)[Symbol.for('__cloudflare-context__')]
  return (ctx?.env ?? {}) as CfEnv
}

function getCredentials() {
  const cfEnv = getCfEnv()
  // Use || (not ??) to treat empty string as missing
  const api_id = process.env.DMM_API_ID || cfEnv.DMM_API_ID
  const affiliate_id = process.env.DMM_AFFILIATE_ID || cfEnv.DMM_AFFILIATE_ID
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

    const res = await fetch(`${BASE_URL}/ItemList?${searchParams}`)

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

    const res = await fetch(`${BASE_URL}/ActressSearch?${searchParams}`)

    if (!res.ok) {
      throw new Error(`DMM ActressSearch API Error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    const parsed = DmmActressResponseSchema.safeParse(json)
    if (!parsed.success) {
      // actress フィールドが存在しない場合（0件時）は空配列で返す
      const raw = json?.result
      if (raw && typeof raw === 'object') {
        return {
          status: raw.status,
          result_count: Number(raw.result_count ?? 0),
          total_count: Number(raw.total_count ?? 0),
          first_position: Number(raw.first_position ?? 1),
          actress: Array.isArray(raw.actress) ? raw.actress : [],
        }
      }
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

    const res = await fetch(`${BASE_URL}/FloorList?${searchParams}`)

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

async function fetchBatch(sort: 'rank' | 'review'): Promise<DmmItem[]> {
  const searchParams = buildParams({
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    hits: 100,
    sort,
  })
  const res = await fetch(`${BASE_URL}/ItemList?${searchParams}`)
  if (!res.ok) return []
  const json = await res.json()
  const parsed = DmmItemListResponseSchema.safeParse(json)
  return parsed.success ? parsed.data.result.items : []
}

/**
 * VR作品判定。ジャンル名に「VR」を含むもの（ハイクオリティVR / VR専用 等）と
 * タイトルの「【VR】」プレフィックスで判定する。
 */
export function isVrItem(item: DmmItem): boolean {
  if (item.iteminfo?.genre?.some((g) => g.name?.includes('VR'))) return true
  if (item.title?.includes('【VR】')) return true
  return false
}

export async function fetchDailySaleItems(hits = 12): Promise<DmmItem[]> {
  // rank上位100 + review上位100 を並列取得して合算
  const [rankItems, reviewItems] = await Promise.all([
    fetchBatch('rank'),
    fetchBatch('review'),
  ])

  const now = Date.now()
  const seen = new Set<string>()

  return [...rankItems, ...reviewItems]
    .filter(item => {
      if (seen.has(item.content_id)) return false
      seen.add(item.content_id)

      // VR作品を除外
      if (isVrItem(item)) return false

      // 公式キャンペーン or 実値引きをセールとみなす
      return isOnSale(item, now)
    })
    .slice(0, hits)
}

// ------------------------------------
// セール作品の横断取得（動画系フロア）
// ------------------------------------

/**
 * セール対象として横断取得する FANZA 動画系フロア。
 * いずれも service=digital でジャケット画像の体裁が揃っており、
 * フロアごとに別々のキャンペーン（ブランドストア / 素人100円 等）が走る。
 */
type SaleSource = { service: string; floor: string }

const SALE_VIDEO_FLOORS: ReadonlyArray<SaleSource> = [
  { service: 'digital', floor: 'videoa' }, // AV
  { service: 'digital', floor: 'videoc' }, // 素人
]

// おとなのおもちゃ（mono/goods）のセール集約用ソース。
// 在庫の大半（rank上位100の88%）が値引き中なので、人気上位＋セール系キーワードで
// 候補を広げ、最終的に isOnSale() で実値引きのみを通す（動画系と同じ設計）。
const GOODS_SALE_FLOORS: ReadonlyArray<SaleSource> = [
  { service: 'mono', floor: 'goods' },
]
const GOODS_SALE_KEYWORDS: ReadonlyArray<string | undefined> = [
  undefined, // 人気上位（キーワードなし）
  'セール',
  '1000円以下',
]

/**
 * セール作品を掘り起こすためのキーワード候補。
 * 人気上位（キーワードなし）だけだとセール作品を 10 件程度しか拾えないが、
 * これらのキーワードで検索すると候補が一気に増える（実測 241 件）。
 * キーワードは「候補ソース」であり、最終的に isOnSale() で実セールのみ通すため
 * ノイズ（非セール）が表に出ることはない。
 */
const SALE_KEYWORDS: ReadonlyArray<string | undefined> = [
  undefined, // 人気上位（キーワードなし）
  'セール',
  '30%OFF',
  '50%OFF',
]

/**
 * 動画系フロア（videoa / videoc）を横断してセール中（公式キャンペーン or 実値引き）の
 * 作品を集める。フロア × セールキーワードの全組み合わせを並列取得し、
 * content_id で重複排除 → isOnSale で絞り込む。
 * 組み合わせ単位で失敗しても他の結果は返す（部分的失敗に強い）。
 */
export async function fetchSaleItems(
  opts: {
    perFloor?: number
    excludeVr?: boolean
    /** 巡回するフロア（既定＝動画系 videoa/videoc）。mono/goods 等に差し替え可能。 */
    floors?: ReadonlyArray<SaleSource>
    /** 候補を広げるキーワード（既定＝動画系セールワード）。 */
    keywords?: ReadonlyArray<string | undefined>
  } = {}
): Promise<DmmItem[]> {
  const perFloor = opts.perFloor ?? 100
  const floors = opts.floors ?? SALE_VIDEO_FLOORS
  const keywords = opts.keywords ?? SALE_KEYWORDS
  const sources = floors.flatMap(({ service, floor }) =>
    keywords.map((keyword) => ({ service, floor, keyword }))
  )
  const batches = await Promise.all(
    sources.map(({ service, floor, keyword }) =>
      fetchItemList({ service, floor, keyword, hits: perFloor, sort: 'rank' })
        .then((r) => r.items)
        .catch(() => [] as DmmItem[])
    )
  )

  const seen = new Set<string>()
  const merged: DmmItem[] = []
  for (const items of batches) {
    for (const it of items) {
      if (seen.has(it.content_id)) continue
      seen.add(it.content_id)
      if (opts.excludeVr && isVrItem(it)) continue
      if (!isOnSale(it)) continue
      merged.push(it)
    }
  }
  return merged
}

/**
 * おとなのおもちゃ（mono/goods・floorId 75）のセール中商品を集める。
 * fetchSaleItems を goods 用ソースで呼ぶ薄いラッパー。VR除外は動画専用なので無効。
 * 値引き判定は isOnSale()（list_price>price の実値引き or 公式キャンペーン）に委ねる。
 */
export async function fetchToysSaleItems(
  opts: { perFloor?: number } = {}
): Promise<DmmItem[]> {
  return fetchSaleItems({
    perFloor: opts.perFloor ?? 100,
    floors: GOODS_SALE_FLOORS,
    keywords: GOODS_SALE_KEYWORDS,
  })
}

// ------------------------------------
// ジャンル一覧（日次キャッシュ）
// ------------------------------------
export type FetchGenreListParams = {
  floor_id?: string
  hits?: number
  offset?: number
  initial?: string
}

export const fetchGenreList = cache(
  async (params: FetchGenreListParams = {}): Promise<DmmGenreResponse['result']> => {
    const searchParams = buildParams({
      floor_id: params.floor_id ?? '43',
      hits: params.hits ?? 100,
      offset: params.offset ?? 1,
      initial: params.initial,
    })

    const res = await fetch(`${BASE_URL}/GenreSearch?${searchParams}`)

    if (!res.ok) {
      throw new Error(`DMM GenreSearch API Error: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    const parsed = DmmGenreResponseSchema.safeParse(json)
    if (!parsed.success) {
      const raw = json?.result
      if (raw && typeof raw === 'object') {
        return {
          status: raw.status,
          result_count: Number(raw.result_count ?? 0),
          total_count: Number(raw.total_count ?? 0),
          first_position: Number(raw.first_position ?? 1),
          genre: Array.isArray(raw.genre) ? raw.genre : [],
        }
      }
      throw new Error(`DMM GenreSearch レスポンスパースエラー: ${parsed.error.message}`)
    }
    return parsed.data.result
  }
)

// ------------------------------------
// videoa + videoc を並列取得してインターリーブマージ
// ------------------------------------
export async function fetchItemListMixed(
  params: Omit<FetchItemListParams, 'service' | 'floor'> & { excludeVr?: boolean } = {}
): Promise<DmmItemListResponse['result']> {
  const { excludeVr, ...listParams } = params
  const [videoa, videoc] = await Promise.all([
    fetchItemList({ ...listParams, service: 'digital', floor: 'videoa' }),
    fetchItemList({ ...listParams, service: 'digital', floor: 'videoc' }),
  ])

  const seen = new Set<string>()
  const merged: DmmItem[] = []
  const maxLen = Math.max(videoa.items.length, videoc.items.length)
  for (let i = 0; i < maxLen; i++) {
    if (videoa.items[i] && !seen.has(videoa.items[i].content_id)) {
      seen.add(videoa.items[i].content_id)
      merged.push(videoa.items[i])
    }
    if (videoc.items[i] && !seen.has(videoc.items[i].content_id)) {
      seen.add(videoc.items[i].content_id)
      merged.push(videoc.items[i])
    }
  }

  const items = excludeVr ? merged.filter((it) => !isVrItem(it)) : merged

  return {
    ...videoa,
    items,
    total_count: videoa.total_count + videoc.total_count,
  }
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
