'use client'

import Image from 'next/image'
import useSWR from 'swr'
import { useAuth } from '@/components/providers/auth-provider'
import { getGuestSwipes } from '@/lib/guest-swipes'
import { parsePrice } from '@/lib/ranking'
import type { RecommendPayload } from '@/app/api/recommend/route'
import type { DmmItem } from '@/types/dmm'

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
    <div className="grid grid-cols-2 gap-2 px-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        const price = parsePrice(item.prices.price)
        const img = item.imageURL.list ?? item.imageURL.large ?? item.imageURL.small ?? null

        return (
          <div key={item.content_id} className="flex flex-col">
            <a
              href={item.affiliateURL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackView(item)}
              className="relative block overflow-hidden rounded-lg bg-white/5"
            >
              {img ? (
                <Image
                  src={img}
                  alt={item.title}
                  width={184}
                  height={250}
                  className="aspect-[184/250] w-full object-cover"
                />
              ) : (
                <div className="aspect-[184/250] w-full bg-white/5" />
              )}
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[8px] font-bold tracking-wider text-white/40 backdrop-blur-sm">
                PR
              </span>
            </a>
            <div className="mt-1 px-0.5">
              <p className="line-clamp-2 text-[10px] leading-tight text-white/60">{item.title}</p>
              {price !== null && (
                <p className="mt-0.5 text-[10px] font-bold tabular-nums text-white/40">
                  ¥{price.toLocaleString('ja-JP')}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── スケルトン ────────────────────────────────────────────────────────────────

export function ForYouSkeleton() {
  return (
    <section>
      <div className="px-4 pt-8">
        <div className="h-5 w-44 animate-pulse rounded bg-white/8" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 px-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="aspect-[184/250] animate-pulse rounded-lg bg-white/8" />
            <div className="h-2 animate-pulse rounded bg-white/5" />
            <div className="h-2 w-2/3 animate-pulse rounded bg-white/5" />
          </div>
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
        <section>
          <div className="px-4 pt-8">
            <h2 className="text-[15px] font-black tracking-tight text-white">
              あなたへのおすすめ
            </h2>
          </div>
          <div className="mt-3">
            <MainGrid items={data.items} />
          </div>
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
