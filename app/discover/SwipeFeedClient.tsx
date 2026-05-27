'use client'

import dynamic from 'next/dynamic'
import type { DmmItem } from '@/types/dmm'

const SwipeFeed = dynamic(
  () => import('@/components/swipe/SwipeFeed').then((m) => ({ default: m.SwipeFeed })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-black text-white/65">
        <p>読み込み中...</p>
      </div>
    ),
  }
)

export function SwipeFeedClient({ initialItems }: { initialItems: DmmItem[] }) {
  return <SwipeFeed initialItems={initialItems} />
}
