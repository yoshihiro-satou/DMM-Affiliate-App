import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'
import { sortByDiscount } from '@/lib/ranking'
import { ProductCard } from '@/components/product/ProductCard'
import { FavoriteButton } from '@/components/product/FavoriteButton'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'セール・値引き作品',
  description: 'FANZAで現在値引き中の作品一覧。割引率の高い順に表示。',
  openGraph: {
    title: 'セール・値引き作品 | FANZA おすすめ',
    description: 'FANZAで現在値引き中の作品一覧。割引率の高い順に表示。',
    url: '/sale',
  },
  alternates: { canonical: '/sale' },
}

export default async function SalePage() {
  const result = await fetchItemList({
    sort: 'rank',
    hits: 40,
    service: 'digital',
    floor: 'videoa',
  })

  const items = sortByDiscount(result.items)

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* ヘッダー */}
      <div className="border-b border-white/8 px-4 py-4">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          SALE
        </span>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">
          セール・値引き作品
        </h1>
        <p className="mt-0.5 text-[11px] text-white/30">
          PR · 割引率の高い順 · {result.total_count.toLocaleString('ja-JP')}件以上
        </p>
      </div>

      {/* 商品グリッド */}
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item, i) => (
          <ProductCard
            key={item.content_id}
            item={item}
            rank={i + 1}
            overlaySlot={<FavoriteButton item={item} />}
          />
        ))}
      </div>
    </main>
  )
}
