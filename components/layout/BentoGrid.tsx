import type { DmmItem } from '@/types/dmm'
import { ProductCard } from '@/components/product/ProductCard'

type Props = {
  items: DmmItem[]
}

export function BentoGrid({ items }: Props) {
  if (items.length === 0) return null

  const [hero, ...rest] = items

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {/* 大タイル: モバイル全幅、sm以上は2カラム分 */}
      {hero && (
        <div className="col-span-2 sm:row-span-2">
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
