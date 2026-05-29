import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchItemList, fetchDailySaleItems, fetchGenreList } from '@/lib/dmm/client'
import { sortByRankingScore } from '@/lib/ranking'
import { BentoGrid } from '@/components/layout/BentoGrid'
import { GridCard } from '@/components/product/GridCard'
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton'
import { ForYouFeedLazy } from '@/components/recommend/ForYouFeedWrapper'
import { DailyDealsSection } from '@/components/home/DailyDealsSection'

export const revalidate = 3600

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

export const metadata: Metadata = {
  title: 'FANZAピックス - FANZAセール・ランキング・推し女優',
  description: 'FANZAの人気作品ランキング・セール情報をアプリ感覚でチェック。推し女優の新作通知や値下げアラートも。スワイプで好みの作品を発見。',
  openGraph: {
    title: 'FANZAピックス - FANZAセール・ランキング・推し女優',
    description: 'FANZAの人気作品ランキング・セール情報をアプリ感覚でチェック。推し女優の新作通知や値下げアラートも。',
    url: '/',
  },
  alternates: { canonical: '/' },
}

// ------------------------------------
// 非同期セクション（Suspenseで個別ストリーミング）
// ------------------------------------
async function RankingSection() {
  try {
    const result = await fetchItemList({ sort: 'rank', hits: 10, service: 'digital', floor: 'videoa' })
    const ranked = sortByRankingScore(result.items)

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '今週のランキング',
      itemListElement: ranked.slice(0, 10).map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.title,
        url: item.affiliateURL,
      })),
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <BentoGrid items={ranked} />
      </>
    )
  } catch {
    return <ApiUnavailable />
  }
}

async function DailySaleSection() {
  try {
    const saleItems = await fetchDailySaleItems(10)

    if (saleItems.length === 0) {
      const result = await fetchItemList({ sort: 'date', hits: 10, service: 'digital', floor: 'videoa' })
      return (
        <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
          {result.items.map((item, i) => (
            <GridCard key={item.content_id} item={item} featured={BENTO_PATTERN[i % BENTO_PATTERN.length]} />
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
        {saleItems.map((item, i) => {
          const soonest = item.campaign
            ?.slice()
            .sort((a, b) => a.date_end.localeCompare(b.date_end))[0]
          return (
            <GridCard
              key={item.content_id}
              item={item}
              featured={BENTO_PATTERN[i % BENTO_PATTERN.length]}
              dateEnd={soonest?.date_end}
            />
          )
        })}
      </div>
    )
  } catch {
    return <ApiUnavailable />
  }
}

function ApiUnavailable() {
  return (
    <p className="py-8 text-center text-[13px] text-white/55">
      コンテンツを準備中です。しばらくお待ちください。
    </p>
  )
}

function LoadingGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 grid-flow-dense gap-2 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} featured={BENTO_PATTERN[i % BENTO_PATTERN.length]} />
      ))}
    </div>
  )
}

async function GenreSection() {
  try {
    const result = await fetchGenreList({ floor_id: '43', hits: 16 })
    const genres = result.genre ?? []
    if (genres.length === 0) return null
    return (
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <a
            key={g.genre_id}
            href={`/genre/${g.genre_id}`}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/75 hover:border-red-500/40 hover:bg-red-950/30 hover:text-white active:opacity-70"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {g.name}
          </a>
        ))}
      </div>
    )
  } catch {
    return null
  }
}

function GenreChipsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-white/8" style={{ width: `${56 + (i % 4) * 16}px` }} />
      ))}
    </div>
  )
}

// ------------------------------------
// ページ本体
// ------------------------------------
export default function HomePage() {
  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* サイトヘッダー */}
      <div className="relative flex items-center justify-between overflow-hidden border-b border-rose-900/40 px-4 py-2.5">
        {/* 背景：深紅×ローズ×パープル */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-950/80 via-rose-950/50 to-purple-950/30" />
        {/* 右側の温かみのある光 */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-rose-500/20 to-transparent" />
        {/* 上部アクセントライン：ゴールド〜ローズ */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-400/50 via-rose-300/40 to-transparent" />
        {/* 下部うっすらグロー */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-rose-600/30 via-pink-500/20 to-transparent" />

        {/* 左：サイト名（縦積み） */}
        <div className="relative flex flex-col gap-0.5">
          <h1 className="bg-gradient-to-r from-amber-200 via-rose-100 to-pink-300 bg-clip-text text-[20px] font-black leading-none tracking-tight text-transparent">
            FANZAピックス
          </h1>
          <span className="text-[8px] font-bold tracking-[0.3em] text-rose-400/60">
            FANZA PICKS
          </span>
        </div>

        {/* 右：短いタグライン */}
        <div className="relative flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-semibold tracking-[0.15em] text-pink-300/60">
            FANZA GUIDE
          </span>
          <span className="text-[10px] text-white/55">
            セール · ランキング
          </span>
        </div>
      </div>

      {/* ランキング */}
      <section className="px-3 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black tracking-tight text-white">
            今週のランキング
          </h2>
          <a href="/ranking" className="text-[13px] font-bold text-red-400 hover:text-red-300 active:text-red-500">
            もっと見る →
          </a>
        </div>
        <Suspense fallback={<LoadingGrid count={6} />}>
          <RankingSection />
        </Suspense>
      </section>

      {/* 日替わり商品 */}
      <section className="px-3 pt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-black tracking-tight text-white">
              今日だけの特別価格
            </h2>
            <span className="text-[10px] text-white/65">日替わり · 本日限り</span>
          </div>
          <a href="/sale" className="text-[13px] font-bold text-red-400 hover:text-red-300 active:text-red-500">
            セール一覧 →
          </a>
        </div>
        <Suspense fallback={<LoadingGrid count={5} />}>
          <DailyDealsSection />
        </Suspense>
      </section>

      {/* 本日のおすすめ */}
      <section className="px-3 pt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-black tracking-tight text-white">本日のおすすめ</h2>
            <span className="text-[10px] text-white/65">評価が上昇中です</span>
          </div>
          <a href="/ranking?period=new" className="text-[13px] font-bold text-red-400 hover:text-red-300 active:text-red-500">
            もっと見る →
          </a>
        </div>
        <Suspense fallback={<LoadingGrid count={4} />}>
          <DailySaleSection />
        </Suspense>
      </section>

      {/* 女優一覧への誘導 */}
      <section className="px-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-black tracking-tight text-white">人気女優</h2>
          <a href="/actress" className="text-[13px] font-bold text-red-400 hover:text-red-300 active:text-red-500">
            女優一覧 →
          </a>
        </div>
      </section>

      {/* ジャンルで探す */}
      <section className="px-4 pt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black tracking-tight text-white">ジャンルで探す</h2>
        </div>
        <Suspense fallback={<GenreChipsSkeleton />}>
          <GenreSection />
        </Suspense>
      </section>

      {/* あなたへのおすすめ（クライアントサイド・SWR） */}
      <ForYouFeedLazy />
    </main>
  )
}
