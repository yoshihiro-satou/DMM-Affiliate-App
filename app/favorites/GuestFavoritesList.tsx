'use client'

import { useSyncExternalStore, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { removeGuestFavorite, type GuestFavItem } from '@/lib/guest-favorites'
import { ShareFavoritesButton } from './ShareFavoritesButton'

function useGuestFavorites(): GuestFavItem[] {
  // useSyncExternalStore handles SSR/client difference without useEffect:
  // server returns '[]', client returns actual localStorage data
  const json = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem('guest_favorites_data') ?? '[]',
    () => '[]'
  )
  return useMemo(() => {
    try {
      return JSON.parse(json) as GuestFavItem[]
    } catch {
      return []
    }
  }, [json])
}

export function GuestFavoritesList() {
  const storeItems = useGuestFavorites()
  // Track same-tab removals optimistically (storage events don't fire in the same tab)
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const items = storeItems.filter((i) => !removed.has(i.item_id))

  function remove(itemId: string) {
    removeGuestFavorite(itemId)
    setRemoved((prev) => new Set([...prev, itemId]))
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="border-b border-white/8 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-black tracking-tight text-white">お気に入り</h1>
            <p className="mt-0.5 text-[11px] text-white/55">{items.length}件</p>
          </div>
          <ShareFavoritesButton titles={items.map((i) => i.title)} />
        </div>
      </div>

      {/* ログイン促進バナー */}
      <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-[12px] font-semibold text-white">ゲストモード（5件まで）</p>
          <p className="mt-0.5 text-[11px] text-white/65">登録すると無制限に保存できます</p>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-bold text-white"
        >
          無料登録
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <GuestFavCard key={item.item_id} item={item} onRemove={remove} />
          ))}
        </div>
      )}
    </main>
  )
}

function GuestFavCard({
  item,
  onRemove,
}: {
  item: GuestFavItem
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex flex-col">
      <a
        href={item.affiliate_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block overflow-hidden rounded-lg bg-white/5"
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.title}
            width={184}
            height={250}
            className="aspect-[184/250] w-full object-cover"
          />
        ) : (
          <div className="aspect-[184/250] w-full bg-white/5" />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold tracking-wider text-white/70 backdrop-blur-sm">
          PR
        </span>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove(item.item_id)
          }}
          className="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
          aria-label="お気に入りを解除"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Heart size={18} className="fill-red-500 text-red-500" />
        </button>
      </a>
      <div className="mt-1.5 flex flex-col gap-1">
        <p className="line-clamp-2 text-[11px] leading-[1.4] text-white/70">{item.title}</p>
        {item.price !== null && (
          <span className="text-[12px] font-bold tabular-nums text-white/60">
            ¥{item.price.toLocaleString('ja-JP')}
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-20 text-center">
      <Heart size={48} className="text-white/10" />
      <div>
        <p className="text-[15px] font-semibold text-white/65">まだお気に入りがありません</p>
        <p className="mt-1 text-[12px] text-white/50">
          作品のハートボタンをタップして保存しましょう
        </p>
      </div>
      <Link
        href="/sale"
        className="mt-2 rounded-xl bg-white/10 px-6 py-2.5 text-[13px] font-semibold text-white/60"
      >
        セール作品を見る
      </Link>
    </div>
  )
}
