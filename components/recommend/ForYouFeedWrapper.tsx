'use client'

import dynamic from 'next/dynamic'
import { ForYouSkeleton } from './ForYouFeed'

export const ForYouFeedLazy = dynamic(
  () => import('./ForYouFeed').then((m) => ({ default: m.ForYouFeed })),
  { ssr: false, loading: () => <ForYouSkeleton /> }
)
