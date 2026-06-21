'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { markAsRead, markAsUnread } from '@/actions/series'
import { BadgeToast } from '@/components/ui/BadgeToast'
import type { BadgeType } from '@/lib/badges'

type Props = {
  itemId: string
  seriesId: number
  isRead: boolean
  totalCount?: number
}

export function ReadToggleButton({ itemId, seriesId, isRead: initialIsRead, totalCount }: Props) {
  const [isRead, setIsRead] = useState(initialIsRead)
  const [isPending, startTransition] = useTransition()
  const [newBadges, setNewBadges] = useState<BadgeType[]>([])

  function toggle() {
    const next = !isRead
    setIsRead(next)
    startTransition(async () => {
      if (next) {
        const result = await markAsRead(itemId, seriesId, totalCount)
        if (result.newBadges.length > 0) setNewBadges(result.newBadges)
      } else {
        await markAsUnread(itemId, seriesId)
      }
    })
  }

  return (
    <>
      <button
        onClick={toggle}
        disabled={isPending}
        aria-label={isRead ? '未購入に戻す' : '購入済みにする'}
        className={`mt-1 flex w-full items-center justify-center gap-1 rounded py-1 text-[10px] font-semibold transition-colors disabled:opacity-60 ${
          isRead
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-white/5 text-white/65 hover:bg-white/10'
        }`}
      >
        {isRead ? (
          <>
            <Check size={10} />
            購入済み
          </>
        ) : (
          '未購入'
        )}
      </button>

      <BadgeToast badges={newBadges} onDismiss={() => setNewBadges([])} />
    </>
  )
}
