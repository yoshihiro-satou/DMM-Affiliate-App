import type { DmmItem } from '@/types/dmm'
import { ProductCard } from '@/components/product/ProductCard'

type Props = {
  items: DmmItem[]
}

export function BentoGrid({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, i) => (
        <ProductCard key={item.content_id} item={item} rank={i + 1} />
      ))}
    </div>
  )
}
