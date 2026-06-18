import type { MetadataRoute } from 'next'
import { fetchActressList, fetchItemList, fetchGenreList } from '@/lib/dmm/client'

// sitemap は DMM API を4本ライブで叩いて生成する動的ルート。無キャッシュだと毎フェッチで
// 上流呼び出しが走り、Workerコールドスタート＋上流の一時的な遅延が重なると稀に応答が
// Googlebot のタイムアウトを跨いで500（GSC「一般的なHTTPエラー」）になる。ISRでKV
// （NEXT_INC_CACHE_KV）にキャッシュし、6時間ごとに再生成して上流呼び出しを critical path から外す。
export const revalidate = 21600 // 6h

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/sale`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/new`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/actress`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/pwa`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/guide`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]

  const [actressResult, itemRankResult, itemDateResult, genreResult] = await Promise.all([
    fetchActressList({ hits: 100, sort: 'id' }).catch(() => null),
    fetchItemList({ sort: 'rank', hits: 100, service: 'digital', floor: 'videoa' }).catch(() => null),
    fetchItemList({ sort: 'date', hits: 100, service: 'digital', floor: 'videoa' }).catch(() => null),
    fetchGenreList({ floor_id: '43', hits: 100 }).catch(() => null),
  ])

  // 女優: カタログ既定100名に加え、人気ランキング/新着の出演女優を統合する。
  // ActressSearch の既定100名は「今ホットな女優」が漏れ、需要の中心（例: 北岡果林/瀬戸環奈）が
  // sitemap外＝Google未発見になる。series 用に取得済みの itemRank/itemDate から出演女優IDを拾い、
  // 需要のある女優ページを能動的に発見させる（API呼び出しの追加なし）。
  // 既定100名=0.7 / 人気・新着出演女優=0.8（後勝ちで優先度を引き上げる）。
  const actressPriority = new Map<string, number>()
  for (const a of actressResult?.actress ?? []) {
    actressPriority.set(a.id, 0.7)
  }
  for (const item of [...(itemRankResult?.items ?? []), ...(itemDateResult?.items ?? [])]) {
    for (const a of item.iteminfo?.actress ?? []) {
      if (a.id !== undefined) actressPriority.set(String(a.id), 0.8)
    }
  }
  const actressRoutes: MetadataRoute.Sitemap = [...actressPriority].map(([id, priority]) => ({
    url: `${BASE_URL}/actress/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority,
  }))

  // ランキング上位＋新着の両方から series ID を集約（新着シリーズの取りこぼしを防ぐ）
  const seriesIds = new Set<number>()
  for (const item of [...(itemRankResult?.items ?? []), ...(itemDateResult?.items ?? [])]) {
    for (const s of item.iteminfo?.series ?? []) {
      if (s.id !== undefined) seriesIds.add(s.id)
    }
  }

  const seriesRoutes: MetadataRoute.Sitemap = [...seriesIds].map((id) => ({
    url: `${BASE_URL}/series/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const genreRoutes: MetadataRoute.Sitemap = (genreResult?.genre ?? []).map((g) => ({
    url: `${BASE_URL}/genre/${g.genre_id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...actressRoutes, ...seriesRoutes, ...genreRoutes]
}
