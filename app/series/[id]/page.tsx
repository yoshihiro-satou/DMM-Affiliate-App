import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
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

  const volumeCount = data.items.length
  const title = `${data.seriesName} 全${volumeCount}巻｜FANZAセール・最新巻まとめ`
  const description = `${data.seriesName}シリーズ全${volumeCount}巻をまとめてチェック。セール中の割引巻・最新巻・独占配信も掲載し、気になる巻はそのままFANZA視聴ページへ。毎日0時にセール速報も配信中（登録不要・無料）。`

  return {
    title,
    description,
    alternates: { canonical: `/series/${id}` },
    openGraph: {
      url: `/series/${id}`,
      title: `${title} | FANZAピックス`,
      description,
      images: thumbnail ? [thumbnail] : undefined,
    },
  }
}

export default async function SeriesDetailPage({ params }: Props) {
  const { id } = await params
  const seriesId = parseInt(id)
  if (isNaN(seriesId)) return <SeriesNotFound />

  const [user, seriesData] = await Promise.all([
    getCurrentUser(),
    fetchSeriesItems(seriesId).catch(() => null),
  ])

  // API エラー → 一時障害のためリトライ画面
  if (seriesData === null) return <SeriesRetry id={id} />
  // 存在しないシリーズ → CF Workers で notFound() が 500 になるため直接 UI を返す
  if (seriesData.items.length === 0) return <SeriesNotFound />

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

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

  // 内部リンク用: シリーズ全巻から出演女優・ジャンルを集約（重複排除）
  const actressMap = new Map<number, string>()
  const genreMap = new Map<number, string>()
  for (const item of items) {
    for (const a of item.iteminfo?.actress ?? []) {
      if (a.id !== undefined && a.name) actressMap.set(a.id, a.name)
    }
    for (const g of item.iteminfo?.genre ?? []) {
      if (g.id !== undefined && g.name) genreMap.set(g.id, g.name)
    }
  }
  const actresses = [...actressMap.entries()].slice(0, 12)
  const genres = [...genreMap.entries()].slice(0, 12)

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWorkSeries',
      name: seriesName,
      numberOfEpisodes: totalCount,
      url: `${SITE_URL}/series/${id}`,
      ...(thumbnail ? { image: thumbnail } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'シリーズ', item: `${SITE_URL}/series` },
        { '@type': 'ListItem', position: 3, name: seriesName, item: `${SITE_URL}/series/${id}` },
      ],
    },
  ]

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* パンくず（内部リンク） */}
      <nav className="flex items-center gap-1.5 px-4 pt-4 text-[11px] text-white/45">
        <Link href="/" className="shrink-0 hover:text-white/70">
          ホーム
        </Link>
        <span className="text-white/25">/</span>
        <Link href="/series" className="shrink-0 hover:text-white/70">
          シリーズ
        </Link>
        <span className="text-white/25">/</span>
        <span className="truncate text-white/60">{seriesName}</span>
      </nav>
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
          <p className="text-[11px] text-white/65">全{totalCount}巻</p>
        </div>
      </div>

      {/* 導入文（SEO・検索意図に一致するテキストコンテンツ／画像グリッドだけだった本文を補強） */}
      <p className="border-b border-white/8 px-4 py-3 text-[12px] leading-relaxed text-white/55">
        <strong className="font-bold text-white/75">{seriesName}</strong>の全{totalCount}巻をまとめてチェックできるシリーズページです。各巻のセール価格・最新巻をひと目で確認でき、気になる巻はそのままFANZAの視聴ページへ。新刊フォローで最新巻の配信も見逃しません。
      </p>

      {/* PR */}
      <p className="px-4 py-1 text-[9px] text-white/40">PR · FANZAアフィリエイトリンク</p>

      {/* 進捗セクション */}
      <div className="border-b border-white/8 px-4 pb-4 pt-2">
        {user ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white/70">
                {readCount}巻読了 / 全{totalCount}巻
              </span>
              {remaining > 0 ? (
                <span className="text-[11px] text-white/65">あと{remaining}巻で完走</span>
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
          <p className="text-[12px] text-white/55">ログインして読書進捗を記録しましょう</p>
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

                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-px text-[8px] font-bold tracking-wider text-white/65 backdrop-blur-sm">
                      PR
                    </span>

                    {isRead && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-full bg-green-500/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          読了
                        </span>
                      </div>
                    )}

                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-px text-[9px] text-white/70 backdrop-blur-sm">
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
                    <p className="mt-0.5 text-[10px] font-bold tabular-nums text-white/65">
                      ¥{price.toLocaleString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 関連リンク（内部リンク・回遊/クロール） */}
      {(actresses.length > 0 || genres.length > 0) && (
        <section className="mt-6 border-t border-white/8 px-4 pt-5">
          {actresses.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-[12px] font-bold text-white/70">出演女優</h2>
              <div className="flex flex-wrap gap-2">
                {actresses.map(([aid, name]) => (
                  <Link
                    key={aid}
                    href={`/actress/${aid}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:border-red-500/50 hover:text-white"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {genres.length > 0 && (
            <div>
              <h2 className="mb-2 text-[12px] font-bold text-white/70">ジャンル</h2>
              <div className="flex flex-wrap gap-2">
                {genres.map(([gid, name]) => (
                  <Link
                    key={gid}
                    href={`/genre/${gid}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60 hover:border-red-500/50 hover:text-white"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function SeriesRetry({ id }: { id: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <p className="text-[14px] text-white/70">データを取得できませんでした</p>
      <a
        href={`/series/${id}`}
        className="rounded-lg border border-red-700/50 px-4 py-2 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300"
      >
        再読み込み
      </a>
    </main>
  )
}

function SeriesNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="text-center">
        <p className="text-[14px] text-white/70">シリーズ情報が見つかりませんでした</p>
      </div>
      <Link
        href="/series"
        className="rounded-lg border border-red-700/50 px-5 py-2.5 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300"
      >
        シリーズ一覧に戻る
      </Link>
    </main>
  )
}
