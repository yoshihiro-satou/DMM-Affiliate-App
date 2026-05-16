'use client'

import Image from 'next/image'
import useSWR from 'swr'
import { useAuth } from '@/components/providers/auth-provider'
import { getGuestSwipes } from '@/lib/guest-swipes'
import { parsePrice } from '@/lib/ranking'
import { GridCard } from '@/components/product/GridCard'
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton'
import type { RecommendPayload } from '@/app/api/recommend/route'
import type { DmmItem } from '@/types/dmm'

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

// ── フェッチャー ───────────────────────────────────────────────────────────────

async function fetcher(url: string): Promise<RecommendPayload> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('recommend fetch failed')
  return res.json() as Promise<RecommendPayload>
}

function buildApiUrl(isLoggedIn: boolean): string {
  if (isLoggedIn) return '/api/recommend'
  try {
    const swipes = getGuestSwipes()
    const seen = swipes.map((s) => s.item_id).slice(0, 20)
    return seen.length > 0 ? `/api/recommend?seen=${seen.join(',')}` : '/api/recommend'
  } catch {
    return '/api/recommend'
  }
}

// ── 閲覧記録（ fire-and-forget ）─────────────────────────────────────────────

function trackView(item: DmmItem): void {
  fetch('/api/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: item.content_id,
      itemTitle: item.title,
      affiliateUrl: item.affiliateURL,
      imageUrl: item.imageURL.list ?? item.imageURL.large ?? null,
    }),
  }).catch(() => {})
}

// ── 前回の続きカード ──────────────────────────────────────────────────────────

function ContinueCard({
  item,
}: {
  item: NonNullable<RecommendPayload['lastViewed']>
}) {
  if (!item.affiliate_url) return null
  return (
    <section className="px-3 pt-6">
      <h2 className="mb-2 text-[13px] font-semibold tracking-tight text-white/50">前回の続き</h2>
      <a
        href={item.affiliate_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 overflow-hidden rounded-xl bg-white/5 p-3 hover:bg-white/8 active:bg-white/10"
      >
        {item.image_url && (
          <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5">
            <Image
              src={item.image_url}
              alt={item.item_title ?? ''}
              fill
              className="object-cover"
              sizes="44px"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12px] leading-snug text-white/70">
            {item.item_title ?? '作品'}
          </p>
          <p className="mt-1 text-[10px] text-red-500/70">FANZA で開く →</p>
        </div>
        <span className="absolute left-1 top-1 text-[8px] text-white/20">PR</span>
      </a>
    </section>
  )
}

// ── カルーセル ────────────────────────────────────────────────────────────────

function HorizontalCarousel({ title, items }: { title: string; items: DmmItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="pt-6">
      <h2 className="mb-3 px-4 text-[15px] font-black tracking-tight text-white">{title}</h2>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => {
          const price = parsePrice(item.prices.price)
          const img = item.imageURL.list ?? item.imageURL.large ?? null

          return (
            <a
              key={item.content_id}
              href={item.affiliateURL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackView(item)}
              className="relative shrink-0 w-28 overflow-hidden rounded-lg bg-white/5"
            >
              {img ? (
                <Image
                  src={img}
                  alt={item.title}
                  width={112}
                  height={150}
                  className="aspect-[112/150] w-full object-cover"
                />
              ) : (
                <div className="aspect-[112/150] w-full bg-white/5" />
              )}
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[7px] font-bold tracking-wider text-white/40">
                PR
              </span>
              <div className="p-1.5">
                <p className="line-clamp-2 text-[9px] leading-tight text-white/60">{item.title}</p>
                {price !== null && (
                  <p className="mt-0.5 text-[9px] font-bold tabular-nums text-white/40">
                    ¥{price.toLocaleString('ja-JP')}
                  </p>
                )}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ── メイングリッド ────────────────────────────────────────────────────────────

function MainGrid({ items }: { items: DmmItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
      {items.map((item, i) => (
        <GridCard
          key={item.content_id}
          item={item}
          featured={BENTO_PATTERN[i % BENTO_PATTERN.length]}
        />
      ))}
    </div>
  )
}

// ── スケルトン ────────────────────────────────────────────────────────────────

export function ForYouSkeleton() {
  return (
    <section className="px-3 pt-8">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
          <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} featured={BENTO_PATTERN[i % BENTO_PATTERN.length]} />
        ))}
      </div>
    </section>
  )
}

// ── メインコンポーネント ──────────────────────────────────────────────────────

export function ForYouFeed() {
  const { isLoggedIn } = useAuth()

  // typeof window === 'undefined' のとき null を返してサーバーレンダリングを回避
  const swrKey = typeof window !== 'undefined' ? buildApiUrl(isLoggedIn) : null

  const { data, isLoading } = useSWR<RecommendPayload>(swrKey, fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  if (isLoading || !data) return <ForYouSkeleton />

  const hasContent =
    data.items.length > 0 || data.genreItems.length > 0 || data.actressItems.length > 0

  return (
    <>
      {data.lastViewed && <ContinueCard item={data.lastViewed} />}

      {hasContent && (
        <section className="px-3 pt-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-black tracking-tight text-white">
                あなたへのおすすめ
              </h2>
              <span className="text-[10px] text-white/40">あなたの好みに合わせた作品</span>
            </div>
            <a href="/ranking" className="text-[13px] font-bold text-red-400 hover:text-red-300 active:text-red-500">
              もっと見る →
            </a>
          </div>
          <MainGrid items={data.items} />
          <HorizontalCarousel
            title="あなたの好みジャンルの急上昇"
            items={data.genreItems}
          />
          <HorizontalCarousel
            title="最近ハマっている女優の新作"
            items={data.actressItems}
          />
        </section>
      )}
    </>
  )
}
