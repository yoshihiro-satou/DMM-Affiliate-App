import type { Metadata } from 'next'
import { fetchItemList, fetchActressList, fetchWithRateLimit } from '@/lib/dmm/client'
import type { FetchItemListParams } from '@/lib/dmm/client'
import { sortByRankingScore } from '@/lib/ranking'
import { GridCard } from '@/components/product/GridCard'
import { ActressCard } from '@/components/actress/ActressCard'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import type { RankingPeriod } from '@/components/ranking/RankingTabs'
import type { DmmActress } from '@/types/dmm'

const BENTO_PATTERN = [true, false, false, false, true, false, false, true, false, false, false, false]

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ランキング',
  description: 'FANZAの人気作品ランキング。日次・週次・月次・素人・人気女優で絞り込み可能。',
  openGraph: {
    title: 'ランキング | FANZA おすすめ',
    description: 'FANZAの人気作品ランキング。日次・週次・月次・素人・人気女優で絞り込み可能。',
    url: '/ranking',
  },
  alternates: { canonical: '/ranking' },
}

// ------------------------------------
// 作品ランキング設定
// ------------------------------------
type ItemPeriodConfig = {
  fetchParams: Omit<FetchItemListParams, 'hits' | 'service' | 'floor'>
  label: string
  applyScore: boolean
  floor?: string  // デフォルト: 'videoa'
}

const ITEM_PERIOD_CONFIG: Partial<Record<RankingPeriod, ItemPeriodConfig>> = {
  daily:   { fetchParams: { sort: 'rank', offset: 1  }, label: '日次ランキング', applyScore: false },
  weekly:  { fetchParams: { sort: 'rank', offset: 41 }, label: '週次ランキング', applyScore: true  },
  monthly: { fetchParams: { sort: 'review'            }, label: '月次ランキング', applyScore: true  },
  amateur: { fetchParams: { sort: 'rank'              }, label: '素人ランキング', applyScore: false, floor: 'videoc' },
}

const PERIOD_LABEL: Record<RankingPeriod, string> = {
  daily:   '日次ランキング',
  weekly:  '週次ランキング',
  monthly: '月次ランキング',
  amateur: '素人ランキング',
  actress: '人気女優',
  genre:   '人気ジャンル',
}

// ------------------------------------
// 人気女優取得（レビュー上位作品の出演頻度でランク）
// ------------------------------------
async function fetchPopularActresses(limit = 12): Promise<DmmActress[]> {
  const result = await fetchItemList({
    sort: 'review',
    hits: 100,
    service: 'digital',
    floor: 'videoa',
  })

  // 出演頻度カウント
  const countMap = new Map<number, number>()
  for (const item of result.items) {
    for (const act of item.iteminfo?.actress ?? []) {
      if (act.id != null) {
        countMap.set(act.id, (countMap.get(act.id) ?? 0) + 1)
      }
    }
  }

  const topIds = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  // 並列実行ではなく直列で取得（DMM API レート制限対策）
  const results = await fetchWithRateLimit(
    topIds.map((id) => () =>
      fetchActressList({ actress_id: id, hits: 1 })
        .then((r) => r.actress[0] ?? null)
        .catch(() => null)
    ),
    150
  )

  return results.filter((a): a is DmmActress => a !== null)
}

// ------------------------------------
// 人気ジャンル取得（ランク上位100作品の出現頻度でランク）
// ------------------------------------
async function fetchPopularGenres(limit = 20) {
  const result = await fetchItemList({
    sort: 'rank',
    hits: 100,
    service: 'digital',
    floor: 'videoa',
  })

  const countMap = new Map<number, { name: string; count: number }>()
  for (const item of result.items) {
    for (const g of item.iteminfo?.genre ?? []) {
      if (g.id == null || !g.name) continue
      const prev = countMap.get(g.id)
      countMap.set(g.id, { name: g.name, count: (prev?.count ?? 0) + 1 })
    }
  }

  return [...countMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id, { name, count }]) => ({ id, name, count }))
}

// ------------------------------------
// ページ
// ------------------------------------
type Props = {
  searchParams: Promise<{ period?: string }>
}

export default async function RankingPage({ searchParams }: Props) {
  const { period = 'daily' } = await searchParams
  const validPeriod = (period in PERIOD_LABEL ? period : 'daily') as RankingPeriod
  const label = PERIOD_LABEL[validPeriod]
  const isActress = validPeriod === 'actress'
  const isGenre   = validPeriod === 'genre'

  if (isGenre) {
    const genres = await fetchPopularGenres().catch(() => [])
    const maxCount = genres[0]?.count ?? 1

    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <div className="border-b border-white/8 px-4 py-4">
          <span
            className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            RANKING
          </span>
          <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">{label}</h1>
          <p className="mt-0.5 text-[11px] text-white/55">PR · 人気上位100作品から集計</p>
        </div>

        <RankingTabs currentPeriod={validPeriod} />

        <div className="divide-y divide-white/6">
          {genres.map((g, i) => {
            const rank = i + 1
            const rankColor =
              rank === 1 ? 'text-yellow-400' :
              rank === 2 ? 'text-slate-300'  :
              rank === 3 ? 'text-amber-600'  :
              'text-white/30'
            const barWidth = Math.round((g.count / maxCount) * 100)
            return (
              <a
                key={g.id}
                href={`/genre/${g.id}`}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/4 active:bg-white/8"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className={`w-7 shrink-0 text-center text-[15px] font-black tabular-nums ${rankColor}`}>
                  {rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-white/90">{g.name}</p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-red-600/50" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-[12px] tabular-nums text-white/40">{g.count}作品</span>
                <svg className="h-4 w-4 shrink-0 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )
          })}
        </div>
      </main>
    )
  }

  if (isActress) {
    const actresses = await fetchPopularActresses().catch(() => [])

    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {/* ヘッダー */}
        <div className="border-b border-white/8 px-4 py-4">
          <span
            className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            RANKING
          </span>
          <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">{label}</h1>
          <p className="mt-0.5 text-[11px] text-white/55">
            PR · レビュー上位作品への出演数順
          </p>
        </div>

        <RankingTabs currentPeriod={validPeriod} />

        <div className="grid grid-cols-2 gap-3 px-3 pb-2 sm:grid-cols-3 md:grid-cols-4">
          {actresses.map((actress) => (
            <ActressCard key={actress.id} actress={actress} />
          ))}
        </div>
      </main>
    )
  }

  // 作品ランキング（daily / weekly / monthly）
  const pageHeader = (
    <>
      <div className="border-b border-white/8 px-4 py-4">
        <span
          className="text-[10px] font-semibold tracking-[0.3em] text-red-600/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          RANKING
        </span>
        <h1 className="mt-1 text-[22px] font-black tracking-tight text-white">{label}</h1>
      </div>
      <RankingTabs currentPeriod={validPeriod} />
    </>
  )

  try {
    const config = ITEM_PERIOD_CONFIG[validPeriod]!
    const result = await fetchItemList({
      ...config.fetchParams,
      hits: 40,
      service: 'digital',
      floor: config.floor ?? 'videoa',
    })
    const items = config.applyScore ? sortByRankingScore(result.items) : result.items

    // ランキング作品から上位ジャンルを集計（出現頻度順・上位10件）
    const genreCountMap = new Map<number, { name: string; count: number }>()
    for (const item of items) {
      for (const g of item.iteminfo?.genre ?? []) {
        if (g.id == null || !g.name) continue
        const prev = genreCountMap.get(g.id)
        genreCountMap.set(g.id, { name: g.name, count: (prev?.count ?? 0) + 1 })
      }
    }
    const topGenres = [...genreCountMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([id, { name }]) => ({ id, name }))

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: label,
      itemListElement: items.slice(0, 10).map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.title,
        url: item.affiliateURL,
      })),
    }

    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {pageHeader}
        <p className="px-4 pb-2 text-[11px] text-white/55">
          PR · {result.total_count.toLocaleString('ja-JP')}件以上
        </p>
        <div className="grid grid-cols-2 grid-flow-dense gap-2 px-3 pb-2 md:grid-cols-4">
          {items.map((item, i) => (
            <GridCard
              key={item.content_id}
              item={item}
              rank={i + 1}
              featured={BENTO_PATTERN[i % BENTO_PATTERN.length]}
            />
          ))}
        </div>
        {topGenres.length > 0 && (
          <div className="border-t border-white/8 px-4 pb-6 pt-4">
            <p className="mb-2.5 text-[10px] font-semibold tracking-wider text-white/40">
              このランキングの人気ジャンル
            </p>
            <div className="flex flex-wrap gap-2">
              {topGenres.map((g) => (
                <a
                  key={g.id}
                  href={`/genre/${g.id}`}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/75 hover:border-red-500/40 hover:bg-red-950/30 hover:text-white active:opacity-70"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {g.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    )
  } catch {
    return (
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {pageHeader}
        <p className="py-16 text-center text-[13px] text-white/55">
          コンテンツを準備中です。しばらくお待ちください。
        </p>
      </main>
    )
  }
}
