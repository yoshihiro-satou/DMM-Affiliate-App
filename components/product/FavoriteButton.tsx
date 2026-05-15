'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import type { DmmItem } from '@/types/dmm'
import { addFavorite, removeFavorite } from '@/actions/favorites'
import { addGuestFavorite, removeGuestFavorite } from '@/lib/guest-favorites'
import { dmmItemToFavorite, dmmItemToGuestFav } from '@/lib/dmm/mappers'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { BadgeToast } from '@/components/ui/BadgeToast'
import { useAuth } from '@/components/providers/auth-provider'
import type { BadgeType } from '@/lib/badges'

type Props = {
  item: DmmItem
  initialFavorited?: boolean
}

export function FavoriteButton({ item, initialFavorited = false }: Props) {
  const { isLoggedIn } = useAuth()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()
  const [showPrompt, setShowPrompt] = useState(false)
  const [newBadges, setNewBadges] = useState<BadgeType[]>([])

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (isLoggedIn) {
      const next = !favorited
      setFavorited(next)
      startTransition(async () => {
        try {
          if (next) {
            const result = await addFavorite(dmmItemToFavorite(item))
            if (result.newBadges.length > 0) setNewBadges(result.newBadges)
          } else {
            await removeFavorite(item.content_id)
          }
        } catch {
          setFavorited(favorited)
        }
      })
    } else {
      if (favorited) {
        setFavorited(false)
        removeGuestFavorite(item.content_id)
      } else {
        const result = addGuestFavorite(dmmItemToGuestFav(item))
        if (result.limitReached) {
          setShowPrompt(true)
        } else {
          setFavorited(true)
        }
      }
    }
  }

  return (
    <>
      <button
        onClick={toggle}
        disabled={isPending}
        className="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-opacity active:opacity-70 disabled:opacity-40"
        aria-label={favorited ? 'お気に入りを解除' : 'お気に入りに追加'}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Heart
          size={18}
          className={favorited ? 'fill-red-500 text-red-500' : 'text-white/60'}
        />
      </button>

      {showPrompt && (
        <LoginPromptSheet
          title="もっと保存するなら無料登録"
          body="ゲストは5件まで保存できます。登録すると無制限に保存・値下げ通知も受け取れます。"
          onClose={() => setShowPrompt(false)}
        />
      )}

      <BadgeToast badges={newBadges} onDismiss={() => setNewBadges([])} />
    </>
  )
}
