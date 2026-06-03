import { buildSaleBroadcast } from '@/lib/broadcast/sale-broadcast'
import { renderOgImage } from '@/lib/og/render'
import { OG_SIZE } from '@/lib/og/template'

export const alt = 'FANZAピックス — FANZAセール・ランキング・推し通知'
export const size = OG_SIZE
export const contentType = 'image/png'
// ビルド時プリレンダーせず、実行時に生成（フォントの動的サブセット取得のため）。
// キャッシュは画像レスポンスの Cache-Control で担保する。
export const dynamic = 'force-dynamic'

/**
 * トップ（＝お気に入りシェアの着地点 /?ref=share でもある）の動的OGP（追加21）。
 * 本日の最大割引率をピルに載せ、シェア時のクリック率を底上げする。
 */
export default async function Image() {
  const message = await buildSaleBroadcast().catch(() => null)
  const maxOff = message?.items?.[0]?.discountRate ?? 0
  const badge = maxOff > 0 ? `本日最大${maxOff}%OFF` : '毎日更新セール'

  return renderOgImage({
    heading: 'FANZAのセールを\nアプリ感覚でチェック',
    sub: 'ランキング・推し女優の新作通知・値下げアラート',
    badge,
    headingSize: 66,
  })
}
