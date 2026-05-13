import type { DmmItem } from '@/types/dmm'
import { ProductCard } from '@/components/product/ProductCard'

type Props = {
  items: DmmItem[]
}

export function BentoGrid({ items }: Props) {
  if (items.length === 0) return null

  const [hero, ...rest] = items

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {/* 大タイル: モバイル 2×1、デスクトップ 2×2 */}
      {hero && (
        <div className="col-span-2 md:row-span-2">
          <ProductCard item={hero} rank={1} featured />
        </div>
      )}
      {/* 中タイル: デスクトップ右側 2枚 (row-span-1 each) */}
      {rest.slice(0, 2).map((item, i) => (
        <div key={item.content_id}>
          <ProductCard item={item} rank={i + 2} />
        </div>
      ))}
      {/* 小タイル: 残り全部 */}
      {rest.slice(2).map((item, i) => (
        <ProductCard key={item.content_id} item={item} rank={i + 4} />
      ))}
    </div>
  )
}
