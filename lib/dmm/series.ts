import 'server-only'
import { fetchItemList } from './client'
import type { DmmItem } from '@/types/dmm'

export type SeriesData = {
  seriesId: number
  seriesName: string
  items: DmmItem[]
  totalCount: number
}

/**
 * 動画(単品購入=service:'digital')以外を除外する。
 * article=series 指定は service 無指定で全サービス横断＝通販(mono)・観放題/見放題(monthly)・
 * レンタル(rental) も拾うため、シリーズ一覧は動画のみに限定する（他の取得は service:'digital' 固定）。
 */
function isPurchasableVideo(item: DmmItem): boolean {
  if (item.service_code) return item.service_code === 'digital'
  // service_code 欠落時はサービス/フロア名のキーワードで保守的に除外
  const name = `${item.service_name ?? ''} ${item.floor_name ?? ''}`
  return !/見放題|観放題|レンタル|通販/.test(name)
}

export async function fetchSeriesItems(seriesId: number): Promise<SeriesData> {
  const result = await fetchItemList({
    article: 'series',
    article_id: seriesId,
    hits: 100,
    sort: 'date',
  })

  // 動画(単品購入)のみに限定（通販・観放題/見放題・レンタルを除外）
  const videoItems = result.items.filter(isPurchasableVideo)

  // DMM の sort=date は新着順 → 逆順にして巻数順（古い順）に並べる
  const items = videoItems.reverse()
  const seriesName =
    items[0]?.iteminfo?.series?.[0]?.name ??
    result.items[0]?.iteminfo?.series?.[0]?.name ??
    `シリーズ #${seriesId}`

  return { seriesId, seriesName, items, totalCount: items.length }
}
