'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import type { DmmItem } from '@/types/dmm'
import { recordSwipe } from '@/actions/swipe'
import { addFavorite } from '@/actions/favorites'
import { addGuestFavorite } from '@/lib/guest-favorites'
import { parsePrice } from '@/lib/ranking'
import { SampleVideoPlayer } from './SampleVideoPlayer'
import { useAuth } from '@/components/providers/auth-provider'

const SWIPE_THRESHOLD = 80
const GUEST_SWIPE_LIMIT = 10
const PREFETCH_AHEAD = 5

type Props = {
  initialItems: DmmItem[]
}

export function SwipeFeed({ initialItems }: Props) {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [guestSwipeCount, setGuestSwipeCount] = useState(0)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const nextOffset = useRef(initialItems.length + 1)
  const [, startTransition] = useTransition()

  const fetchMore = useCallback(async () => {
    if (isFetching) return
    setIsFetching(true)
    try {
      const res = await fetch(
        `/api/dmm/items?service=digital&floor=videoa&sort=rank&hits=20&offset=${nextOffset.current}`
      )
      if (res.ok) {
        const data = (await res.json()) as { items?: DmmItem[] }
        if (data.items?.length) {
          setItems((prev) => [...prev, ...data.items!])
          nextOffset.current += 20
        }
      }
    } finally {
      setIsFetching(false)
    }
  }, [isFetching])

  const handleSwipe = useCallback(
    (itemId: string, direction: 'like' | 'skip' | 'detail', item: DmmItem) => {
      if (direction === 'detail') {
        router.push(`/item/${item.content_id}`)
        return
      }

      navigator.vibrate?.(10)

      if (!isLoggedIn) {
        const newCount = guestSwipeCount + 1
        setGuestSwipeCount(newCount)
        try {
          const history = JSON.parse(
            localStorage.getItem('guest_swipe_history') ?? '[]'
          ) as Array<{ item_id: string; direction: string; created_at: string }>
          history.push({ item_id: itemId, direction, created_at: new Date().toISOString() })
          localStorage.setItem('guest_swipe_history', JSON.stringify(history))
        } catch {}
        if (newCount >= GUEST_SWIPE_LIMIT) setShowLoginPrompt(true)
      }

      if (direction === 'like') {
        if (isLoggedIn) {
          startTransition(async () => {
            await addFavorite({
              item_id: item.content_id,
              item_title: item.title,
              item_url: item.affiliateURL,
              image_url: item.imageURL.list ?? item.imageURL.large ?? null,
              price: parsePrice(item.prices.price),
            })
          })
        } else {
          addGuestFavorite({
            item_id: item.content_id,
            title: item.title,
            affiliate_url: item.affiliateURL,
            image_url: item.imageURL.list ?? item.imageURL.large ?? null,
            price: parsePrice(item.prices.price),
            list_price: parsePrice(item.prices.list_price),
          })
        }
      }

      if (isLoggedIn) {
        startTransition(async () => {
          await recordSwipe(itemId, direction)
        })
      }

      setCurrentIndex((i) => {
        const next = i + 1
        if (items.length - next <= PREFETCH_AHEAD) fetchMore()
        return next
      })
    },
    [isLoggedIn, guestSwipeCount, items.length, fetchMore, router]
  )

  const currentItem = items[currentIndex]
  if (!currentItem) {
    return (
      <div className="flex h-dvh items-center justify-center text-white/60">
        <p>読み込み中...</p>
      </div>
    )
  }

  const visibleItems = items.slice(currentIndex, currentIndex + 3)

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {[...visibleItems].reverse().map((item, reverseIdx) => {
        const stackIdx = visibleItems.length - 1 - reverseIdx
        return (
          <SwipeCard
            key={item.content_id}
            item={item}
            isTop={stackIdx === 0}
            stackIdx={stackIdx}
            onSwipe={(dir) => handleSwipe(item.content_id, dir, item)}
          />
        )
      })}

      {/* Sticky "FANZAで見る" CTA */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] flex justify-center">
        <a
          href={currentItem.affiliateURL}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="pointer-events-auto flex h-11 min-w-[44px] items-center rounded-full bg-red-600 px-6 text-sm font-bold text-white shadow-xl"
        >
          FANZAで見る
        </a>
      </div>

      {showLoginPrompt && <SwipeLoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  )
}

type SwipeCardProps = {
  item: DmmItem
  isTop: boolean
  stackIdx: number
  onSwipe: (direction: 'like' | 'skip' | 'detail') => void
}

function SwipeCard({ item, isTop, stackIdx, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-20, 20])
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1])
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0])

  async function handleDragEnd(
    _: unknown,
    info: { offset: { x: number; y: number } }
  ) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      await animate(x, 700, { type: 'tween', duration: 0.25 })
      onSwipe('like')
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      await animate(x, -700, { type: 'tween', duration: 0.25 })
      onSwipe('skip')
    } else if (info.offset.y < -SWIPE_THRESHOLD) {
      onSwipe('detail')
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 })
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 25 })
    }
  }

  const scale = 1 - stackIdx * 0.04
  const cardY = stackIdx * 14

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-none"
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : cardY,
        rotate: isTop ? rotate : 0,
        scale,
        zIndex: 10 - stackIdx,
        touchAction: 'none',
      }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={isTop ? handleDragEnd : undefined}
    >
      <SampleVideoPlayer item={item} isActive={isTop} />

      {/* Gradient for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />

      {/* LIKE stamp */}
      <motion.div
        className="pointer-events-none absolute left-5 top-14 rotate-[-15deg] rounded-md border-[3px] border-green-400 px-3 py-1"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-xl font-black tracking-widest text-green-400">LIKE</span>
      </motion.div>

      {/* SKIP stamp */}
      <motion.div
        className="pointer-events-none absolute right-5 top-14 rotate-[15deg] rounded-md border-[3px] border-red-400 px-3 py-1"
        style={{ opacity: skipOpacity }}
      >
        <span className="text-xl font-black tracking-widest text-red-400">SKIP</span>
      </motion.div>

      {/* Item info */}
      <div className="pointer-events-none absolute inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))]">
        {item.iteminfo?.actress?.[0]?.name && (
          <p className="mb-1 text-xs font-medium text-white/70">
            {item.iteminfo.actress[0].name}
          </p>
        )}
        <h2 className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow-sm">
          {item.title}
        </h2>
        {item.prices.price && (
          <p className="mt-1 text-xs text-white/60">¥{item.prices.price}</p>
        )}
      </div>
    </motion.div>
  )
}

function SwipeLoginPrompt({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#1a1a1a] px-6 pb-10 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-bold text-white">スワイプ履歴を保存しませんか？</h2>
        <p className="mt-2 text-[13px] text-white/50">
          無料登録するとスワイプ履歴に基づいたパーソナライズ推薦・値下げ通知が利用できます。
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
          このまま続ける
        </button>
      </div>
    </>
  )
}
