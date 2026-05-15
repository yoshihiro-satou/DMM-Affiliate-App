import type { Metadata } from 'next'
import { fetchItemList } from '@/lib/dmm/client'
import { SwipeFeedClient } from './SwipeFeedClient'

export const metadata: Metadata = {
  title: '探す',
  description: 'スワイプでお気に入りを見つけよう',
}

export default async function DiscoverPage() {
  const result = await fetchItemList({
    service: 'digital',
    floor: 'videoa',
    hits: 20,
    sort: 'rank',
  })

  return <SwipeFeedClient initialItems={result.items} />
}
