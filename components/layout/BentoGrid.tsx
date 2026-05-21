import type { DmmItem } from '@/types/dmm'
import { GridCard } from '@/components/product/GridCard'

// 不規則なパターン（ギャップ: 3, 2, 4 の繰り返し）
const PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

function isFeatured(index: number) {
  return PATTERN[index % PATTERN.length]
}

type Props = {
  items: DmmItem[]
}

export function BentoGrid({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
      {items.map((item, i) => (
        <GridCard
          key={item.content_id}
          item={item}
          rank={i + 1}
          featured={isFeatured(i)}
          dateEnd={item.campaign?.[0]?.date_end}
        />
      ))}
    </div>
  )
}
