import 'server-only'
import { fetchItemList } from './client'
import type { DmmItem } from '@/types/dmm'

export type SeriesData = {
  seriesId: number
  seriesName: string
  items: DmmItem[]
  totalCount: number
}

export async function fetchSeriesItems(seriesId: number): Promise<SeriesData> {
  const result = await fetchItemList({
    article: 'series',
    article_id: seriesId,
    hits: 100,
    sort: 'date',
  })

  // DMM の sort=date は新着順 → 逆順にして巻数順（古い順）に並べる
  const items = [...result.items].reverse()
  const seriesName =
    result.items[0]?.iteminfo?.series?.[0]?.name ?? `シリーズ #${seriesId}`

  return { seriesId, seriesName, items, totalCount: result.total_count }
}
