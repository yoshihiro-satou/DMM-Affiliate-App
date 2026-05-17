'use client'

import { useState, useTransition, useRef, useCallback, useMemo } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import type { DmmItem } from '@/types/dmm'
import { recordSwipe } from '@/actions/swipe'
import { addFavorite } from '@/actions/favorites'
import { addGuestFavorite } from '@/lib/guest-favorites'
import { addGuestSwipe } from '@/lib/guest-swipes'
import { dmmItemToFavorite, dmmItemToGuestFav } from '@/lib/dmm/mappers'
import { SampleVideoPlayer } from './SampleVideoPlayer'
import { LoginPromptSheet } from '@/components/ui/LoginPromptSheet'
import { BadgeToast } from '@/components/ui/BadgeToast'
import { useAuth } from '@/components/providers/auth-provider'
import type { BadgeType } from '@/lib/badges'

const SWIPE_THRESHOLD = 80
const GUEST_SWIPE_LIMIT = 10
const PREFETCH_AHEAD = 5

type Props = {
  initialItems: DmmItem[]
}

export function SwipeFeed({ initialItems }: Props) {
  const { isLoggedIn } = useAuth()
  const [items, setItems] = useState(initialItems)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [newBadges, setNewBadges] = useState<BadgeType[]>([])
  const isFetchingRef = useRef(false)
  const guestSwipeCountRef = useRef(0)
  const nextOffset = useRef(initialItems.length + 1)
  const [, startTransition] = useTransition()

  const fetchMore = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
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
      isFetchingRef.current = false
    }
  }, [])

  const handleSwipe = useCallback(
    (itemId: string, direction: 'like' | 'skip', item: DmmItem) => {
      navigator.vibrate?.(10)

      if (!isLoggedIn) {
        addGuestSwipe(itemId, direction)
        guestSwipeCountRef.current += 1
        if (guestSwipeCountRef.current >= GUEST_SWIPE_LIMIT) setShowLoginPrompt(true)
      }

      if (direction === 'like') {
        if (isLoggedIn) {
          startTransition(async () => {
            await addFavorite(dmmItemToFavorite(item))
          })
        } else {
          addGuestFavorite(dmmItemToGuestFav(item))
        }
      }

      if (isLoggedIn) {
        startTransition(async () => {
          const result = await recordSwipe(itemId, direction)
          if (result.newBadges.length > 0) setNewBadges(result.newBadges)
        })
      }

      setCurrentIndex((i) => {
        const next = i + 1
        if (items.length - next <= PREFETCH_AHEAD) fetchMore()
        return next
      })
    },
    [isLoggedIn, items.length, fetchMore]
  )

  const visibleItems = useMemo(
    () => items.slice(currentIndex, currentIndex + 3),
    [items, currentIndex]
  )

  const currentItem = items[currentIndex]
  if (!currentItem) {
    return (
      <div className="flex h-dvh items-center justify-center text-white/60">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      {/* デスクトップでは中央寄せ・最大幅制限 */}
      <div className="relative mx-auto h-full w-full max-w-[480px]">
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
      </div>

      {showLoginPrompt && (
        <LoginPromptSheet
          title="スワイプ履歴を保存しませんか？"
          body="無料登録するとスワイプ履歴に基づいたパーソナライズ推薦・値下げ通知が利用できます。"
          closeLabel="このまま続ける"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      <BadgeToast badges={newBadges} onDismiss={() => setNewBadges([])} />
    </div>
  )
}

type SwipeCardProps = {
  item: DmmItem
  isTop: boolean
  stackIdx: number
  onSwipe: (direction: 'like' | 'skip') => void
}

function SwipeCard({ item, isTop, stackIdx, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-300, 300], [-15, 15])
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
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 25 })
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 25 })
    }
  }

  // 後ろのカードは少し縮小して重なり感を演出
  const scale = 1 - stackIdx * 0.035

  return (
    <div
      className="absolute inset-x-4 overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl"
      style={{
        // ステータスバー分 + 余白を上に、ナビ分 + 余白を下に → 画面中央より少し上に配置
        top: `calc(env(safe-area-inset-top, 0px) + ${14 + stackIdx * 6}px)`,
        bottom: `calc(64px + env(safe-area-inset-bottom) + ${8 - stackIdx * 2}px)`,
        maxHeight: 680,
        zIndex: 10 - stackIdx,
      }}
    >
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{
          x: isTop ? x : 0,
          y: 0,
          rotate: isTop ? rotate : 0,
          scale,
          touchAction: 'none',
        }}
        drag={isTop}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={isTop ? handleDragEnd : undefined}
      >
        {/* 動画エリア: ここにタッチしてもドラッグ開始しない */}
        <div
          className="relative w-full shrink-0"
          onPointerDown={isTop ? (e) => e.stopPropagation() : undefined}
          style={{ touchAction: 'auto' }}
        >
          <SampleVideoPlayer item={item} isActive={isTop} />

          {/* LIKE stamp */}
          <motion.div
            className="pointer-events-none absolute left-4 top-4 -rotate-15 rounded-lg border-[3px] border-green-400 px-3 py-1"
            style={{ opacity: likeOpacity }}
          >
            <span className="text-xl font-black tracking-widest text-green-400">LIKE</span>
          </motion.div>

          {/* SKIP stamp */}
          <motion.div
            className="pointer-events-none absolute right-4 top-4 rotate-15 rounded-lg border-[3px] border-red-400 px-3 py-1"
            style={{ opacity: skipOpacity }}
          >
            <span className="text-xl font-black tracking-widest text-red-400">SKIP</span>
          </motion.div>
        </div>

        {/* 情報 + スワイプヒント + CTA */}
        <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
          {/* 作品情報 — 上部固定 */}
          <div className="space-y-1.5">
            {item.iteminfo?.actress?.[0]?.name && (
              <p className="text-xs font-medium text-white/50">
                {item.iteminfo.actress[0].name}
              </p>
            )}
            <h2 className="line-clamp-2 text-sm font-bold leading-snug text-white">
              {item.title}
            </h2>

            {/* 価格・メーカー */}
            <div className="flex items-center gap-2">
              {item.prices.price && (
                <span className="text-xs font-semibold text-white/60">¥{item.prices.price}</span>
              )}
              {item.iteminfo?.maker?.[0]?.name && (
                <span className="truncate text-xs text-white/30">
                  {item.iteminfo.maker[0].name}
                </span>
              )}
            </div>

            {/* レビュー + 発売日 */}
            <div className="flex items-center gap-3">
              {item.review?.average && Number(item.review.average) > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-xs">{'★'.repeat(Math.round(Number(item.review.average)))}</span>
                  <span className="text-[10px] text-white/30">
                    {item.review.average}
                    {item.review.count ? `（${item.review.count}件）` : ''}
                  </span>
                </div>
              )}
              {item.date && (
                <span className="text-[10px] text-white/25">
                  {item.date.slice(0, 10)}
                </span>
              )}
            </div>

            {/* ジャンルタグ */}
            {item.iteminfo?.genre && item.iteminfo.genre.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {item.iteminfo.genre.slice(0, 6).map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/35"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* サンプル画像ストリップ */}
            {(() => {
              const imgs =
                item.sampleImageURL?.sample_s?.image ??
                item.sampleImageURL?.sample_l?.image ??
                []
              if (imgs.length === 0) return null
              return (
                <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {imgs.slice(0, 8).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-14 w-auto flex-none rounded object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )
            })()}
          </div>

          {/* CTA — mt-auto で下部に寄せる */}
          <div className="mt-auto pt-3">
            <a
              href={item.affiliateURL}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="pointer-events-auto flex h-11 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-lg active:scale-95"
            >
              FANZAで見る
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
