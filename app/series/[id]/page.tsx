import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchSeriesItems } from '@/lib/dmm/series'
import { getCurrentUser, createClient } from '@/lib/supabase/server'
import { parsePrice } from '@/lib/ranking'
import { ReadToggleButton } from './_components/ReadToggleButton'
import { FollowButton } from './_components/FollowButton'
import { BulkBuyButton } from './_components/BulkBuyButton'

export const revalidate = 3600
export const dynamicParams = true

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const seriesId = parseInt(id)
  if (isNaN(seriesId)) return { title: 'シリーズ' }

  const data = await fetchSeriesItems(seriesId).catch(() => null)
  if (!data) return { title: 'シリーズ' }

  const thumbnail =
    data.items[0]?.imageURL.list ?? data.items[0]?.imageURL.large ?? null

  return {
    title: data.seriesName,
    description: `${data.seriesName} 全${data.items.length}巻のシリーズ完走トラッカー`,
    openGraph: {
      title: `${data.seriesName} | シリーズトラッカー`,
      images: thumbnail ? [thumbnail] : undefined,
    },
  }
}

export default async function SeriesDetailPage({ params }: Props) {
  const { id } = await params
  const seriesId = parseInt(id)
  if (isNaN(seriesId)) notFound()

  const [user, seriesData] = await Promise.all([
    getCurrentUser(),
    fetchSeriesItems(seriesId).catch(() => null),
  ])

  if (!seriesData || seriesData.items.length === 0) notFound()

  const { seriesName, items } = seriesData

  let readItemIds = new Set<string>()
  let isFollowing = false

  if (user) {
    const supabase = await createClient()
    const [progressResult, followResult] = await Promise.all([
      supabase
        .from('series_progress')
        .select('item_id')
        .eq('user_id', user.sub)
        .eq('series_id', seriesId),
      supabase
        .from('followed_series')
        .select('id')
        .eq('user_id', user.sub)
        .eq('series_id', seriesId)
        .maybeSingle(),
    ])
    readItemIds = new Set((progressResult.data ?? []).map((r) => r.item_id))
    isFollowing = !!followResult.data
  }

  const readCount = items.filter((item) => readItemIds.has(item.content_id)).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0
  const remaining = totalCount - readCount

  const unreadUrls = items
    .filter((item) => !readItemIds.has(item.content_id))
    .map((item) => item.affiliateURL)
  const allUrls = items.map((item) => item.affiliateURL)

  const thumbnail =
    items[items.length - 1]?.imageURL.list ??
    items[items.length - 1]?.imageURL.large ??
    null

  return (
    <main className="min-h-dvh bg-[#080808] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* ヘッダー */}
      <div className="flex gap-4 border-b border-white/8 px-4 py-5">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-white/5">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={seriesName}
              fill
              className="object-cover"
              priority
              sizes="64px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/10">
              ?
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <span
            className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            SERIES
          </span>
          <h1 className="line-clamp-2 text-[18px] font-black leading-snug tracking-tight text-white">
            {seriesName}
          </h1>
          <p className="text-[11px] text-white/40">全{totalCount}巻</p>
        </div>
      </div>

      {/* PR */}
      <p className="px-4 py-1 text-[9px] text-white/20">PR · FANZAアフィリエイトリンク</p>

      {/* 進捗セクション */}
      <div className="border-b border-white/8 px-4 pb-4 pt-2">
        {user ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white/70">
                {readCount}巻読了 / 全{totalCount}巻
              </span>
              {remaining > 0 ? (
                <span className="text-[11px] text-white/40">あと{remaining}巻で完走</span>
              ) : (
                <span className="text-[11px] font-bold text-yellow-400">完走達成!</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-[12px] text-white/30">ログインして読書進捗を記録しましょう</p>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 px-4 py-3">
        {user && (
          <FollowButton
            seriesId={seriesId}
            seriesName={seriesName}
            isFollowing={isFollowing}
          />
        )}
        {unreadUrls.length > 0 && (
          <BulkBuyButton
            urls={unreadUrls}
            label={`未読${unreadUrls.length}巻まとめ購入`}
            variant="primary"
          />
        )}
        <BulkBuyButton urls={allUrls} label="全巻FANZAで開く" variant="secondary" />
      </div>

      {/* 巻一覧 */}
      <div className="px-3 pt-1">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item, i) => {
            const isRead = readItemIds.has(item.content_id)
            const price = parsePrice(item.prices.price)
            const imgSrc =
              item.imageURL.list ??
              item.imageURL.large ??
              item.imageURL.small ??
              null

            return (
              <div key={item.content_id} className="flex flex-col">
                <div className="relative">
                  <a
                    href={item.affiliateURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block overflow-hidden rounded-lg bg-white/5"
                  >
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={item.title}
                        width={184}
                        height={250}
                        className={`aspect-[184/250] w-full object-cover transition-opacity ${isRead ? 'opacity-35' : 'opacity-100'}`}
                      />
                    ) : (
                      <div className="aspect-[184/250] w-full bg-white/5" />
                    )}

                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[8px] font-bold tracking-wider text-white/40 backdrop-blur-sm">
                      PR
                    </span>

                    {isRead && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-green-500/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          読了
                        </span>
                      </div>
                    )}

                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-px text-[9px] text-white/50 backdrop-blur-sm">
                      {i + 1}巻
                    </span>
                  </a>

                  {user && (
                    <ReadToggleButton
                      itemId={item.content_id}
                      seriesId={seriesId}
                      isRead={isRead}
                      totalCount={totalCount}
                    />
                  )}
                </div>

                <div className="mt-1 px-0.5">
                  <p className="line-clamp-2 text-[10px] leading-tight text-white/60">
                    {item.title}
                  </p>
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
      </div>
    </main>
  )
}
