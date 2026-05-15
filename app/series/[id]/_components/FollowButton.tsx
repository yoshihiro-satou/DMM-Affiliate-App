'use client'

import { useState, useTransition } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { followSeries, unfollowSeries } from '@/actions/series'

type Props = {
  seriesId: number
  seriesName: string
  isFollowing: boolean
}

export function FollowButton({ seriesId, seriesName, isFollowing: initialIsFollowing }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !isFollowing
    setIsFollowing(next)
    startTransition(async () => {
      if (next) {
        await followSeries(seriesId, seriesName)
      } else {
        await unfollowSeries(seriesId)
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-60 ${
        isFollowing
          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
          : 'bg-white/8 text-white/60 hover:bg-white/15'
      }`}
    >
      {isFollowing ? <BellOff size={13} /> : <Bell size={13} />}
      {isFollowing ? 'フォロー中' : 'フォロー'}
    </button>
  )
}
