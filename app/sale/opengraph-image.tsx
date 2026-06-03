import { buildSaleBroadcast } from '@/lib/broadcast/sale-broadcast'
import { renderOgImage } from '@/lib/og/render'
import { OG_SIZE } from '@/lib/og/template'

export const alt = '今日のFANZAセール・割引作品'
export const size = OG_SIZE
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

/**
 * /sale の動的OGP（追加21・施策4と連動）。
 * 本日の最大割引率と日付を載せ、フレッシュネスとCTRを上げる。
 */
export default async function Image() {
  const message = await buildSaleBroadcast().catch(() => null)
  const maxOff = message?.items?.[0]?.discountRate ?? 0

  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const dateLabel = `${now.getUTCMonth() + 1}月${now.getUTCDate()}日`

  return renderOgImage({
    heading: '今日のFANZAセール',
    sub: `${dateLabel}更新・毎時最新化。割引作品をまとめてチェック`,
    badge: maxOff > 0 ? `最大${maxOff}%OFF` : '毎日更新',
    headingSize: 84,
  })
}
