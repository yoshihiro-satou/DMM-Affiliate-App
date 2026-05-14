'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { removeFavorite } from '@/actions/favorites'

export function RemoveFavoriteButton({ itemId }: { itemId: string }) {
  const [removed, setRemoved] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (removed) return null

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setRemoved(true)
    startTransition(async () => {
      try {
        await removeFavorite(itemId)
      } catch {
        setRemoved(false)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-opacity active:opacity-70 disabled:opacity-40"
      aria-label="お気に入りを解除"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <Heart size={18} className="fill-red-500 text-red-500" />
    </button>
  )
}
