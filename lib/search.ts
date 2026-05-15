import 'server-only'
import { fetchItemList } from '@/lib/dmm/client'
import { parsePrice } from '@/lib/ranking'
import type { DmmItem } from '@/types/dmm'

// ── 型定義 ────────────────────────────────────────────────────────────────────

export type SearchResultItem = {
  content_id: string
  title: string
  affiliate_url: string
  image_url: string | null
  price: number | null
  list_price: number | null
  discount_rate: number | null
  review_average: number | null
  review_count: number
  floor: string | null
  actress: string[]
  genre: string[]
}

export type SearchResponse = {
  items: SearchResultItem[]
  total: number
  query: string
}

export type SearchSort = 'rank' | 'date' | '-price' | 'price' | 'review'

// ── DMM Item → SearchResultItem 変換 ─────────────────────────────────────────

function dmmToResult(item: DmmItem): SearchResultItem {
  const price = parsePrice(item.prices.price)
  const listPrice = parsePrice(item.prices.list_price)
  const discountRate =
    listPrice !== null && price !== null && listPrice > price
      ? Math.round((1 - price / listPrice) * 100)
      : null

  return {
    content_id: item.content_id,
    title: item.title,
    affiliate_url: item.affiliateURL,
    image_url:
      item.sampleImageURL?.sample_l?.image?.[3] ??
      item.imageURL.list ??
      item.imageURL.large ??
      null,
    price,
    list_price: listPrice,
    discount_rate: discountRate,
    review_average: item.review?.average ? parseFloat(item.review.average) : null,
    review_count: item.review?.count ?? 0,
    floor: item.floor_name ?? null,
    actress: item.iteminfo?.actress?.map((a) => a.name ?? '').filter(Boolean) ?? [],
    genre: item.iteminfo?.genre?.map((g) => g.name ?? '').filter(Boolean) ?? [],
  }
}

// ── ソートマッピング ──────────────────────────────────────────────────────────

const DMM_SORT: Record<SearchSort, 'rank' | 'date' | 'price' | '-price' | 'review' | 'match'> = {
  rank: 'rank',
  date: 'date',
  '-price': '-price',
  price: 'price',
  review: 'review',
}

// ── メイン検索関数 ────────────────────────────────────────────────────────────

export async function searchItems(params: {
  q: string
  sort?: SearchSort
  page?: number
  hitsPerPage?: number
}): Promise<SearchResponse> {
  const { q, sort = 'rank', page = 1, hitsPerPage = 20 } = params
  const offset = (page - 1) * hitsPerPage

  const result = await fetchItemList({
    keyword: q || undefined,
    sort: q ? 'match' : DMM_SORT[sort],
    hits: hitsPerPage,
    offset: offset + 1,
    service: 'digital',
    floor: 'videoa',
  })

  return {
    items: result.items.map(dmmToResult),
    total: result.total_count,
    query: q,
  }
}
