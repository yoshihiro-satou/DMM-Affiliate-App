import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'
import { SwipeFeedClient } from './SwipeFeedClient'

export const metadata: Metadata = {
  title: '探す',
  description: 'スワイプでお気に入りを見つけよう',
}

export default async function DiscoverPage() {
  try {
    const result = await fetchItemList({
      service: 'digital',
      floor: 'videoa',
      hits: 20,
      sort: 'rank',
    })
    return <SwipeFeedClient initialItems={result.items} />
  } catch {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <p className="text-[13px] text-white/30">コンテンツを準備中です。しばらくお待ちください。</p>
      </main>
    )
  }
}
