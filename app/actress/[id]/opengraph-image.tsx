import { fetchActressList, fetchItemList } from '@/lib/dmm/client'
import { renderOgImage } from '@/lib/og/render'
import { OG_SIZE } from '@/lib/og/template'

export const alt = '女優のFANZAおすすめ作品'
export const size = OG_SIZE
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

/**
 * 女優ページの動的OGP（追加21・施策2と連動）。
 * 名前・掲載作品数・3サイズを載せたテキスト主体のカードを生成する
 * （DMM公式サムネは改変不可のため使わない）。
 */
export default async function Image({ params }: Props) {
  const { id } = await params
  const actressId = parseInt(id, 10)

  if (isNaN(actressId)) {
    return renderOgImage({ heading: '女優ページ', sub: 'FANZAピックス' })
  }

  const [result, works] = await Promise.all([
    fetchActressList({ actress_id: actressId }).catch(() => null),
    fetchItemList({
      article: 'actress',
      article_id: actressId,
      service: 'digital',
      floor: 'videoa',
      hits: 1,
    }).catch(() => null),
  ])

  const actress = result?.actress?.[0]
  if (!actress) {
    return renderOgImage({ heading: '女優ページ', sub: 'FANZAピックス' })
  }

  const total = works?.total_count ?? 0
  const stats = [
    actress.bust ? `B${actress.bust}` : '',
    actress.waist ? `W${actress.waist}` : '',
    actress.hip ? `H${actress.hip}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const subParts = [
    total > 0 ? `おすすめ作品 全${total}本` : 'おすすめ作品をチェック',
    stats,
  ].filter(Boolean)

  // 長い名前は折り返す前提でサイズを落とす
  const headingSize = actress.name.length >= 8 ? 64 : 88

  return renderOgImage({
    heading: actress.name,
    sub: subParts.join('　'),
    badge: 'FANZA',
    headingSize,
  })
}
