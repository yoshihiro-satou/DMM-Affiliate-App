import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'

export const metadata: Metadata = {
  title: '探す',
  description: 'スワイプでお気に入りを見つけよう',
}

const SwipeFeed = dynamic(
  () => import('@/components/swipe/SwipeFeed').then((m) => ({ default: m.SwipeFeed })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-black text-white/40">
        <p>読み込み中...</p>
      </div>
    ),
  }
)

export default async function DiscoverPage() {
  const result = await fetchItemList({
    service: 'digital',
    floor: 'videoa',
    hits: 20,
    sort: 'rank',
  })

  return <SwipeFeed initialItems={result.items} />
}
