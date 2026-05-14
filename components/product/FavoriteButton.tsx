'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import type { DmmItem } from '@/types/dmm'
import { addFavorite, removeFavorite } from '@/actions/favorites'
import { addGuestFavorite, removeGuestFavorite } from '@/lib/guest-favorites'
import { parsePrice } from '@/lib/ranking'
import { useAuth } from '@/components/providers/auth-provider'

type Props = {
  item: DmmItem
  initialFavorited?: boolean
}

export function FavoriteButton({ item, initialFavorited = false }: Props) {
  const { isLoggedIn } = useAuth()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()
  const [showPrompt, setShowPrompt] = useState(false)

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (isLoggedIn) {
      const next = !favorited
      setFavorited(next)
      startTransition(async () => {
        try {
          if (next) {
            await addFavorite({
              item_id: item.content_id,
              item_title: item.title,
              item_url: item.affiliateURL,
              image_url: item.imageURL.list ?? item.imageURL.large ?? null,
              price: parsePrice(item.prices.price),
            })
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
        const result = addGuestFavorite({
          item_id: item.content_id,
          title: item.title,
          affiliate_url: item.affiliateURL,
          image_url: item.imageURL.list ?? item.imageURL.large ?? null,
          price: parsePrice(item.prices.price),
          list_price: parsePrice(item.prices.list_price),
        })
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

      {showPrompt && <LoginPrompt onClose={() => setShowPrompt(false)} />}
    </>
  )
}

function LoginPrompt({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#1a1a1a] px-6 pb-10 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-bold text-white">もっと保存するなら無料登録</h2>
        <p className="mt-2 text-[13px] text-white/50">
          ゲストは5件まで保存できます。登録すると無制限に保存・値下げ通知も受け取れます。
        </p>
        <Link
          href="/login"
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-red-600 font-bold text-white"
          onClick={onClose}
        >
          無料で登録する
        </Link>
        <button
          onClick={onClose}
          className="mt-3 flex h-10 w-full items-center justify-center text-[13px] text-white/40"
        >
          あとで
        </button>
      </div>
    </>
  )
}
